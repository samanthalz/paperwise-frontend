"use client";

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {X} from "lucide-react";

type RenamePaperPopupProps = {
    open: boolean;
    onCloseAction: () => void;
    pdfId: string;
    currentTitle?: string;
    onRenamedAction: (newTitle: string) => void;
};

export function RenamePaperPopup({
                                     open,
                                     onCloseAction,
                                     pdfId,
                                     currentTitle = "",
                                     onRenamedAction,
                                 }: RenamePaperPopupProps) {
    const [newTitle, setNewTitle] = useState(currentTitle);
    const [saving, setSaving] = useState(false);

    // <-- IMPORTANT: reset local state whenever the popup opens or the currentTitle changes
    useEffect(() => {
        if (open) {
            setNewTitle(currentTitle ?? "");
        }
    }, [open, currentTitle]);

    const handleRename = async () => {
        if (!newTitle.trim()) return;
        setSaving(true);

        try {
            const res = await fetch(`http://127.0.0.1:8000/rename_pdf/`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({pdf_id: pdfId, new_title: newTitle}),
            });

            if (res.ok) {
                onRenamedAction(newTitle);
                onCloseAction();
            }
        } catch (err) {
            console.error("Rename failed:", err);
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
                    className="absolute top-2 right-2"
                    onClick={onCloseAction}
                    style={{
                        backgroundColor: "var(--popup-header-bg)",
                        color: "var(--popup-text)",
                    }}
                >
                    <X className="w-5 h-5"/>
                </Button>

                <h2 className="text-lg font-semibold text-center" style={{color: "var(--popup-heading)"}}>
                    Rename Paper
                </h2>

                <Input
                    placeholder="Enter new title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={{
                        backgroundColor: "var(--popup-highlight)",
                        borderColor: "var(--popup-border)",
                        color: "var(--popup-text)",
                    }}
                />

                <div className="flex justify-end gap-2 mt-3">
                    <Button
                        variant="outline"
                        onClick={onCloseAction}
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
