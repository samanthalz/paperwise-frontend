"use client";

import {SidebarTrigger} from "@/components/ui/sidebar";
import {Button} from "@/components/ui/button";
import {Plus, Upload} from "lucide-react";
import {topbarClasses} from "@/components/topbars/topbar-base";
import UploadPdfDialog from "@/components/topbars/upload-file-popup";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";

export default function DocumentsTopbar() {
    const supabase = createClientComponentClient();

    const handleUpload = async (file: File) => {
        try {
            // 🔹 1. Get current user
            const {data: {user}, error: userError} = await supabase.auth.getUser();
            if (userError || !user) throw new Error("User not authenticated");

            // 🔹 2. Prepare a file path (match your RLS folder rule)
            const fileExt = file.name.split(".").pop();
            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`; // user folder = auth.uid()

            // 🔹 3. Upload to Supabase Storage bucket
            const {error: uploadError} = await supabase.storage
                .from("papers") // must match your bucket name
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: "application/pdf",
                });

            if (uploadError) throw uploadError;

            // 🔹 4. Get the public URL (or signed URL for private access)
            const {data: signedUrlData} = await supabase.storage
                .from("papers")
                .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days validity

            const fileUrl = signedUrlData?.signedUrl ?? null;

            // 🔹 5. Insert into 'papers' table
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

            // 🔹 6. Insert into 'user_papers' (link table)
            const {error: linkError} = await supabase
                .from("user_papers")
                .insert({
                    user_id: user.id,
                    pdf_id: insertedPaper.pdf_id,
                });

            if (linkError) throw linkError;

            console.log("Uploaded:", insertedPaper);

            // ✅ Return pdf_id for further processing
            return insertedPaper;  // <-- return the whole record or just { pdf_id: insertedPaper.pdf_id }

        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error("Upload failed:", error.message);
                alert("Upload failed: " + error.message);
            } else {
                console.error("Upload failed:", error);
                alert("An unexpected error occurred.");
            }
        }
    };

    return (
        <div className={`${topbarClasses} flex items-center gap-4 px-6`}>
            {/* Left side: SidebarTrigger + Divider + Title */}
            <div className="flex items-center gap-4 flex-nowrap">
                <SidebarTrigger/>
                <div className="h-6 w-[2px] bg-border flex-shrink-0"/>
                <h1 className="text-lg font-semibold whitespace-nowrap">
                    Documents
                </h1>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center gap-2 h-full ml-auto">
                <Button
                    variant="outline"
                    className="flex items-center gap-2 h-10 px-3"
                >
                    <Plus className="w-4 h-4"/>
                    Create Folder
                </Button>

                <UploadPdfDialog onUpload={handleUpload}>
                    <Button
                        variant="default"
                        className="flex items-center gap-2 h-10 px-3"
                    >
                        <Upload className="w-4 h-4"/>
                        Upload File
                    </Button>
                </UploadPdfDialog>
            </div>
        </div>
    );
}
