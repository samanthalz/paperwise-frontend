"use client";

import React, {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Dropzone} from "@/components/ui/dropzone";
import {FileText, Upload} from "lucide-react";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";
import {toast} from "sonner";
import {RealtimeChannel} from "@supabase/supabase-js";

interface UploadedPaper {
    pdf_id: string;
}

interface UploadPdfDialogProps {
    onUpload: (file: File) => Promise<UploadedPaper>;
    onDuplicate?: (pdfId: string) => void;
    children?: React.ReactNode;
}

export default function UploadPdfDialog({
                                            onUpload,
                                            onDuplicate,
                                            children,
                                        }: UploadPdfDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [open, setOpen] = useState(false);
    const supabase = createClientComponentClient();

    const handleFileSelect = (files: File[]) => {
        const selected = files[0];
        if (selected && selected.type === "application/pdf") {
            setFile(selected);
        } else {
            setFile(null);
            toast.error("Please upload a PDF file only.");
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);

        let channel: RealtimeChannel | null = null;

        try {
            // Upload file
            const uploadedPaper = await onUpload(file);
            const pdfId = uploadedPaper?.pdf_id;
            if (!pdfId) throw new Error("No pdf_id returned from upload");

            toast.info("Processing your PDF...");

            // Subscribe to realtime updates
            channel = supabase
                .channel(`realtime-papers-${pdfId}`)
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "papers",
                        filter: `pdf_id=eq.${pdfId}`,
                    },
                    (payload) => {
                        const checkpoint = payload.new.checkpoint || "";
                        console.log("Realtime update:", checkpoint);

                        // --- Handle duplicate case ---
                        if (checkpoint.includes("Duplicate")) {
                            toast.error("Upload failed! This file already exists.");
                            setIsUploading(false);
                            setFile(null);
                            setOpen(false);
                            if (onDuplicate) onDuplicate(pdfId);
                            channel?.unsubscribe();
                            return;
                        }

                        // --- Handle successful processing ---
                        if (checkpoint.includes("Background processing started")) {
                            toast.success("Upload successful! 🎉");
                            setIsUploading(false);
                            setFile(null);
                            setOpen(false);
                            channel?.unsubscribe();
                            return;
                        }
                    }
                )
                .subscribe();

            // Trigger backend processing
            const backendUrl =
                process.env.NEXT_PUBLIC_BACKEND_URL;

            await fetch(`${backendUrl}/process_existing_pdf/`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({pdf_id: pdfId}),
            });

        } catch (err) {
            console.error(err);
            toast.error("Upload or processing failed.");
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button
                        variant="default"
                        className="flex items-center gap-2 h-10 px-3 cursor-pointer"
                    >
                        <Upload className="w-4 h-4 text-[var(--popup-heading)]"/>
                        Upload File
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent
                className="max-w-md rounded-2xl shadow-lg border p-6"
                style={{
                    backgroundColor: "var(--popup-bg)",
                    borderColor: "var(--popup-border)",
                    boxShadow: "var(--popup-shadow)",
                    color: "var(--popup-text)",
                }}
            >
                {/* --- Header --- */}
                <DialogHeader
                    className="text-center rounded-xl p-3 mb-2"
                    style={{
                        color: "var(--popup-heading)",
                    }}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Upload className="w-5 h-5 text-blue-600"/>
                        <DialogTitle className="text-lg font-semibold">
                            Upload PDF File
                        </DialogTitle>
                    </div>
                </DialogHeader>

                {/* --- Dropzone --- */}
                <Dropzone
                    onDrop={handleFileSelect}
                    accept={{"application/pdf": [".pdf"]}}
                    className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center
                    cursor-pointer transition hover:bg-[var(--popup-highlight)]"
                >
                    {file ? (
                        <div className="flex flex-col items-center space-y-2">
                            <FileText className="h-10 w-10 text-[var(--popup-heading)]"/>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm opacity-70">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center space-y-2 opacity-70">
                            <Upload className="h-10 w-10 text-[var(--popup-heading)]"/>
                            <p>Drag & drop your PDF here, or click to select</p>
                            <p className="text-xs">Only .pdf files are allowed</p>
                        </div>
                    )}
                </Dropzone>

                {/* --- Footer --- */}
                <div className="flex justify-end gap-2 mt-4">
                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="text-white cursor-pointer transition hover:opacity-90"
                    >
                        {isUploading ? "Uploading..." : "Upload"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>


    );

}
