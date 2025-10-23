"use client";

import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {FolderPlus, X} from "lucide-react";

type CreateFolderPopupProps = {
    open: boolean;
    onClose: () => void;
    onCreate: (folderName: string) => void | Promise<void>;
};

export function CreateFolderPopup({open, onClose, onCreate}: CreateFolderPopupProps) {
    const [folderName, setFolderName] = useState("");
    const [saving, setSaving] = useState(false);

    const handleCreate = async () => {
        if (!folderName.trim()) return;
        setSaving(true);
        try {
            await onCreate(folderName.trim());
            setFolderName("");
            onClose();
        } catch (e) {
            console.error("Failed to create folder:", e);
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
                {/* Close button */}
                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={onClose}
                    style={{
                        backgroundColor: "var(--popup-header-bg)",
                        color: "var(--popup-text)",
                    }}
                >
                    <X className="w-5 h-5"/>
                </Button>

                {/* Title */}
                <div className="flex items-center justify-center gap-2">
                    <FolderPlus className="w-6 h-6 text-blue-600"/>
                    <h2
                        className="text-lg font-semibold"
                        style={{color: "var(--popup-heading)"}}
                    >
                        Create New Folder
                    </h2>
                </div>

                {/* Input */}
                <Input
                    placeholder="Folder name"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    style={{
                        backgroundColor: "var(--popup-highlight)",
                        borderColor: "var(--popup-border)",
                        color: "var(--popup-text)",
                    }}
                />

                {/* Footer buttons */}
                <div className="flex justify-end gap-2 mt-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={saving}
                        style={{
                            borderColor: "var(--popup-border)",
                            color: "var(--popup-text)",
                            backgroundColor: "var(--popup-highlight)",
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={saving || !folderName.trim()}
                        style={{
                            backgroundColor: saving
                                ? "oklch(75% 0.05 280)"
                                : "oklch(65% 0.15 280)",
                            color: "white",
                        }}
                    >
                        {saving ? "Creating..." : "Create"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
