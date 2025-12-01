"use client";

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Edit3, X} from "lucide-react";
import {toast} from "sonner";

type RenameFolderPopupProps = {
    open: boolean;
    onCloseAction: () => void;
    folderId: string;
    currentName?: string;
    onRenamedAction: (newName: string) => void;
};

export function RenameFolderPopup({
                                      open,
                                      onCloseAction,
                                      folderId,
                                      currentName = "",
                                      onRenamedAction,
                                  }: RenameFolderPopupProps) {
    const [newName, setNewName] = useState(currentName);
    const [saving, setSaving] = useState(false);

    // Reset local state when popup opens or currentName changes
    useEffect(() => {
        if (open) {
            setNewName(currentName ?? "");
        }
    }, [open, currentName]);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const handleRename = async () => {
        if (!newName?.trim()) return;
        setSaving(true);

        try {
            const res = await fetch(`${backendUrl}/rename_folder/`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({folder_id: folderId, new_title: newName}),
            });

            if (res.ok) {
                toast.success("Folder renamed successfully!");
                onRenamedAction(newName);
                onCloseAction();
            } else {
                const errorData = await res.json();
                toast.error(`Rename failed: ${errorData.message || "Unknown error"}`);
            }
        } catch (err) {
            console.error("Rename failed:", err);
            toast.error("Rename failed. Please try again.");
        } finally {
            setSaving(false);
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
                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 text-gray-700 hover:text-gray-950 transition-colors"
                    onClick={onCloseAction}
                >
                    <X className="w-5 h-5"/>
                </Button>

                <h2
                    className="text-lg font-semibold text-center flex items-center justify-center gap-2"
                    style={{color: "var(--popup-heading)"}}
                >
                    <Edit3 className="w-5 h-5 text-blue-600"/>
                    Rename Folder
                </h2>

                <Input
                    placeholder="Enter new folder name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{
                        backgroundColor: "var(--popup-header-bg)",
                        borderColor: "var(--popup-border)",
                        color: "var(--popup-text)",
                    }}
                />

                <div className="flex justify-end gap-2 mt-3">
                    <Button
                        onClick={handleRename}
                        disabled={saving}
                        style={{
                            backgroundColor: saving ? "oklch(75% 0.05 280)" : "oklch(65% 0.15 280)",
                            color: "white",
                        }}
                    >
                        {saving ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
