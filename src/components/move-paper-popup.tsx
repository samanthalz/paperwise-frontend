"use client";

import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {FolderCode, X} from "lucide-react";

export function MovePaperPopup({
                                   pdfId,
                                   open,
                                   folders,
                                   onCloseAction,
                                   onMovedAction,
                               }: {
    pdfId: string;
    open: boolean;
    folders: { id: string; name: string }[];
    onCloseAction: () => void;
    onMovedAction: (folderId: string | null) => void;
}) {
    const [folderId, setFolderId] = useState("");
    const [moving, setMoving] = useState(false);

    const handleMove = async () => {
        if (!folderId) return;

        // Convert "root" to null before sending to backend
        const targetFolderId = folderId === "root" ? null : folderId;

        setMoving(true);
        const res = await fetch(`http://127.0.0.1:8000/move_pdf/`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({pdf_id: pdfId, folder_id: targetFolderId}),
        });

        setMoving(false);
        if (res.ok) {
            onMovedAction(targetFolderId);
            onCloseAction();
            setFolderId("");
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
                                backgroundColor: "var(--popup-highlight)",
                                borderColor: "var(--popup-border)",
                                color: "var(--popup-text)",
                            }}
                        >
                            <SelectValue placeholder="Select folder"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="root">Main Page</SelectItem> {/* Use "root" instead of "" */}
                            {folders.length > 0 ? (
                                folders.map((f) => (
                                    <SelectItem key={f.id} value={f.id}>
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
                        variant="outline"
                        onClick={onCloseAction}
                        disabled={moving}
                        style={{
                            backgroundColor: "var(--popup-highlight)",
                            borderColor: "var(--popup-border)",
                            color: "var(--popup-text)",
                        }}
                    >
                        Cancel
                    </Button>
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
