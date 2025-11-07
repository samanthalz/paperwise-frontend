"use client";

import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Trash2, X} from "lucide-react";
import {toast} from "sonner";

export function DeleteFolderPopup({
                                      folderId,
                                      folderName,
                                      open,
                                      onCloseAction,
                                      onDeletedAction,
                                  }: {
    folderId: string;
    folderName: string;
    open: boolean;
    onCloseAction: () => void;
    onDeletedAction: () => void;
}) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);

        const res = await fetch(`http://127.0.0.1:8000/delete_folder/`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({folder_id: folderId}),
        });

        setDeleting(false);
        if (res.ok) {
            onDeletedAction();
            onCloseAction();
            toast.success("Folder deleted successfully!");
        } else {
            toast.error("Failed to delete folder. Please try again.");
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="rounded-lg p-6 w-[400px] max-w-full shadow-lg flex flex-col gap-4 relative bg-white">
                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 text-gray-700 hover:text-gray-950 transition-colors"
                    onClick={onCloseAction}
                >
                    <X className="w-5 h-5"/>
                </Button>

                <div className="flex items-center justify-center gap-2">
                    <Trash2 className="w-5 h-5 text-red-500"/>
                    <h2 className="text-lg font-semibold text-red-600">
                        Delete Folder
                    </h2>
                </div>

                <p className="text-sm text-center">
                    Are you sure you want to delete the folder <b>{folderName}</b>?
                    All papers inside will also be removed from your view.
                </p>

                <div className="flex justify-end gap-2 mt-4">
                    <Button className="bg-red-600 text-white" onClick={handleDelete} disabled={deleting}>
                        {deleting ? "Deleting..." : "Delete"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
