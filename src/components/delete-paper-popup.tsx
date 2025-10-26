"use client";

import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Trash2, X} from "lucide-react";

export function DeletePaperPopup({
                                     pdfId,
                                     open,
                                     onCloseAction,
                                     onDeletedAction,
                                 }: {
    pdfId: string;
    open: boolean;
    onCloseAction: () => void;
    onDeletedAction: () => void;
}) {
    const handleDelete = async () => {
        const res = await fetch(`http://127.0.0.1:8000/delete_pdf/`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({pdf_id: pdfId}),
        });

        if (res.ok) {
            onDeletedAction();
            onCloseAction();

            toast.success("Paper deleted successfully", {
                description: "The paper has been permanently removed.",
            });
        } else {
            toast.error("Failed to delete", {
                description: "Something went wrong. Please try again.",
            });
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div
                className="rounded-lg p-6 w-[400px] max-w-full shadow-lg flex flex-col gap-4 relative"
                style={{
                    backgroundColor: "var(--popup-bg)",
                    color: "var(--popup-text)",
                    boxShadow: "var(--popup-shadow)",
                    border: "1px solid var(--popup-border)",
                }}
            >
                {/* Close button */}
                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 text-gray-700 hover:text-gray-950 transition-colors"
                    onClick={onCloseAction}
                >
                    <X className="w-5 h-5"/>
                </Button>

                <h2 className="text-lg font-semibold text-center flex items-center justify-center gap-2 text-red-600">
                    <Trash2 className="w-5 h-5 text-red-600"/>
                    Delete Paper
                </h2>
                <p className="text-sm text-gray-600 text-center">
                    Are you sure you want to delete this paper? This action cannot be undone.
                </p>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={onCloseAction}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    );
}
