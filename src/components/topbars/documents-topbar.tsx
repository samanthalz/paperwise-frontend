"use client";

import {SidebarTrigger} from "@/components/ui/sidebar";
import {Button} from "@/components/ui/button";
import {Plus, Upload} from "lucide-react";
import {topbarClasses} from "@/components/topbars/topbar-base";
import UploadPdfDialog from "@/components/topbars/upload-file-popup";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";
import {CreateFolderPopup} from "@/components/create-folder-popup";
import {useState} from "react";
import {toast} from "sonner";

interface DocumentsTopbarProps {
    onDuplicate?: (pdfId: string) => void;
    onCreateFolder: (folder: { id: string; name: string }) => void;
}

export default function DocumentsTopbar({
                                            onDuplicate,
                                            onCreateFolder,
                                        }: DocumentsTopbarProps) {
    const supabase = createClientComponentClient();
    const [createOpen, setCreateOpen] = useState(false);

    const handleUpload = async (file: File) => {
        try {
            const {
                data: {user},
                error: userError,
            } = await supabase.auth.getUser();
            if (userError || !user) throw new Error("User not authenticated");

            const fileExt = file.name.split(".").pop();
            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const {error: uploadError} = await supabase.storage
                .from("papers")
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: "application/pdf",
                });

            if (uploadError) throw uploadError;

            const {data: signedUrlData} = await supabase.storage
                .from("papers")
                .createSignedUrl(filePath, 60 * 60 * 24 * 7);

            const fileUrl = signedUrlData?.signedUrl ?? null;

            const {data: insertedPaper, error: paperError} = await supabase
                .from("papers")
                .insert({
                    title: null,
                    filename: file.name,
                    user_id: user.id,
                    published: new Date().toISOString(),
                    supabase_url: fileUrl,
                    thumbnail_url: null,
                    checkpoint: "Uploaded",
                })
                .select()
                .single();

            if (paperError) throw paperError;

            const {error: linkError} = await supabase
                .from("user_papers")
                .insert({
                    user_id: user.id,
                    pdf_id: insertedPaper.pdf_id,
                });

            if (linkError) throw linkError;

            console.log("Uploaded:", insertedPaper);
            return insertedPaper;
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error("Upload failed:", error.message);
                toast.error("Upload failed: " + error.message);
            } else {
                console.error("Upload failed:", error);
                toast.error("An unexpected error occurred.");
            }
        }
    };

    // ✅ renamed this to avoid conflict with prop
    const handleCreateFolder = async (folderName: string) => {
        try {
            const {
                data: {user},
                error: userError,
            } = await supabase.auth.getUser();
            if (userError || !user) throw new Error("User not authenticated");

            const {data, error: insertError} = await supabase
                .from("folders")
                .insert({
                    name: folderName,
                    user_id: user.id,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // ✅ Update UI via parent callback
            onCreateFolder({id: data.id, name: data.name});

            toast.success(`Folder "${folderName}" created`);
        } catch (err) {
            console.error("❌ Failed to create folder:", err);
            toast.error("Failed to create folder");
        }
    };

    return (
        <div className={`${topbarClasses} flex items-center gap-4 px-6`}>
            {/* Left side */}
            <div className="flex items-center gap-4 flex-nowrap">
                <SidebarTrigger/>
                <div className="h-6 w-[2px] bg-border flex-shrink-0"/>
                <h1
                    className="text-lg font-semibold whitespace-nowrap"
                    style={{color: "var(--popup-heading)"}}
                >
                    Documents
                </h1>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center gap-2 h-full ml-auto">
                <Button
                    variant="outline"
                    className="flex items-center gap-2 h-10 px-3"
                    onClick={() => setCreateOpen(true)}
                >
                    <Plus className="w-4 h-4"/>
                    Create Folder
                </Button>

                <UploadPdfDialog onUpload={handleUpload} onDuplicate={onDuplicate}>
                    <Button
                        variant="default"
                        className="flex items-center gap-2 h-10 px-3"
                    >
                        <Upload className="w-4 h-4"/>
                        Upload File
                    </Button>
                </UploadPdfDialog>

                <CreateFolderPopup
                    open={createOpen}
                    onCloseAction={() => setCreateOpen(false)}
                    onCreateAction={handleCreateFolder}
                />
            </div>
        </div>
    );
}
