"use client";

import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {FolderCode, X} from "lucide-react";
import {toast} from "sonner";

export function MovePaperPopup({
                                   pdfId,
                                   open,
                                   folders,
                                   onCloseAction,
                                   onMovedAction,
                                   currentFolderId,
                               }: {
    pdfId: string;
    open: boolean;
    folders: { id: string; name: string }[];
    onCloseAction: () => void;
    onMovedAction: (folderId: string | null) => void;
    currentFolderId?: string | null;
}) {
    const [folderId, setFolderId] = useState("");
    const [moving, setMoving] = useState(false);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const handleMove = async () => {
        if (!folderId) return;

        const targetFolderId = folderId === "root" ? null : folderId;

        setMoving(true);
        try {
            const res = await fetch(`${backendUrl}/move_pdf/`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({pdf_id: pdfId, folder_id: targetFolderId}),
            });

            if (res.ok) {
                toast.success("Paper moved successfully!");
                onMovedAction(targetFolderId);
                onCloseAction();
                setFolderId("");
            } else {
                const errorData = await res.json();
                toast.error(`Failed to move PDF: ${errorData.message || "Unknown error"}`);
            }
        } catch (err) {
            console.error("Move PDF error:", err);
            toast.error("Failed to move PDF. Please try again.");
        } finally {
            setMoving(false);
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

                {/* Title */}
                <div className="flex items-center justify-center gap-2">
                    <FolderCode className="w-5 h-5 text-blue-600"/>
                    <h2 className="text-lg font-semibold" style={{color: "var(--popup-heading)"}}>
                        Move Paper
                    </h2>
                </div>

                {/* Folder selection */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium" style={{color: "var(--popup-text)"}}>
                        Choose a folder:
                    </label>

                    <Select onValueChange={setFolderId} value={folderId}>
                        <SelectTrigger
                            className="w-full"
                            style={{
                                backgroundColor: "var(--popup-header-bg)",
                                borderColor: "var(--popup-border)",
                                color: "var(--popup-text)",
                            }}
                        >
                            <SelectValue placeholder="Select folder"/>
                        </SelectTrigger>

                        <SelectContent>
                            {/* Main Page option */}
                            <SelectItem value="root" disabled={!currentFolderId}>
                                Main Page
                            </SelectItem>

                            {/* Folder list */}
                            {folders.length > 0 ? (
                                folders.map((f) => (
                                    <SelectItem
                                        key={f.id}
                                        value={f.id}
                                        disabled={currentFolderId === f.id}
                                    >
                                        {f.name}
                                    </SelectItem>
                                ))
                            ) : (
                                <div className="px-2 py-1 text-sm text-muted-foreground">
                                    No folders available
                                </div>
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-2 mt-4">
                    <Button
                        onClick={handleMove}
                        disabled={!folderId || moving}
                        style={{
                            backgroundColor: "oklch(70% 0.14 270)",
                            color: "white",
                        }}
                    >
                        {moving ? "Moving..." : "Move"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
