"use client";

import React, {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Dropzone} from "@/components/ui/dropzone";
import {FileText, Upload} from "lucide-react";

interface UploadedPaper {
    pdf_id: string;
}

interface UploadPdfDialogProps {
    onUpload: (file: File) => Promise<UploadedPaper> | UploadedPaper;
    children?: React.ReactNode;
}

export default function UploadPdfDialog({onUpload, children}: UploadPdfDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false); // ✅ add this

    const handleFileSelect = (files: File[]) => {
        const selected = files[0];
        if (selected && selected.type === "application/pdf") {
            setFile(selected);
            setError(null);
        } else {
            setFile(null);
            setError("Please upload a PDF file only.");
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        try {
            const uploadedPaper = await onUpload(file);
            const pdfId = uploadedPaper?.pdf_id;
            if (!pdfId) throw new Error("No pdf_id returned from upload");

            const response = await fetch("http://127.0.0.1:8000/process_existing_pdf/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({pdf_id: pdfId}),
            });

            const result = await response.json();
            if (!response.ok) {
                console.error("Backend processing failed:", result.detail || result);
                alert("Processing failed: " + (result.detail || "Unknown error"));
            } else {
                console.log("Processing started:", result);
                alert("Upload successful! Background processing started.");
                setOpen(false); // ✅ close dialog
            }

            setFile(null);
        } catch (err) {
            console.error(err);
            setError("Upload or processing failed. Try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}> {/* ✅ make it controlled */}
            <DialogTrigger asChild>
                {children || (
                    <Button variant="default" className="flex items-center gap-2 h-10 px-3">
                        <Upload className="w-4 h-4"/>
                        Upload File
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload PDF File</DialogTitle>
                </DialogHeader>

                <Dropzone
                    onDrop={handleFileSelect}
                    accept={{"application/pdf": [".pdf"]}}
                    className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer"
                >
                    {file ? (
                        <div className="flex flex-col items-center space-y-2">
                            <FileText className="h-10 w-10 text-blue-600"/>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                            <Upload className="h-10 w-10 text-gray-400"/>
                            <p>Drag & drop your PDF here, or click to select</p>
                            <p className="text-xs text-gray-400">Only .pdf files are allowed</p>
                        </div>
                    )}
                </Dropzone>

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
                        Cancel
                    </Button>
                    <Button onClick={handleUpload} disabled={!file || isUploading}>
                        {isUploading ? "Uploading..." : "Upload"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
