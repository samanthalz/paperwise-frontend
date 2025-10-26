"use client";

import {useMemo, useState} from "react";
import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Copy, X} from "lucide-react";
import {CitationStyle, generateCitations} from "@/utils/citation";

type CitationPopupProps = {
    open: boolean;
    onCloseAction: () => void;
    title: string;
    authors: string[];
    arxivId?: string;
    publishedDate: string;
};

export function CitationPopup({open, onCloseAction, title, authors, arxivId, publishedDate}: CitationPopupProps) {
    const [selectedStyle, setSelectedStyle] = useState<CitationStyle>("Harvard");
    const citations = useMemo(() => generateCitations({
        title,
        authors,
        arxivId,
        publishedDate
    }), [title, authors, arxivId, publishedDate]);
    const currentCitation = citations.find((c) => c.style === selectedStyle);

    // separate states for the two buttons
    const [copiedFull, setCopiedFull] = useState(false);
    const [copiedInText, setCopiedInText] = useState(false);

    const handleCopy = (text: string, type: "full" | "inText") => {
        navigator.clipboard.writeText(text);

        if (type === "full") {
            setCopiedFull(true);
            setTimeout(() => setCopiedFull(false), 1000);
        } else {
            setCopiedInText(true);
            setTimeout(() => setCopiedInText(false), 1000);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div
                className="rounded-lg p-6 w-[450px] max-w-full shadow-lg flex flex-col gap-4 relative"
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
                    onClick={onCloseAction}
                    style={{
                        backgroundColor: "var(--popup-header-bg)",
                        color: "var(--popup-text)",
                    }}
                >
                    <X className="w-5 h-5"/>
                </Button>

                <h2
                    className="text-lg font-semibold text-center"
                    style={{color: "var(--popup-heading)"}}
                >
                    Generate Citation
                </h2>

                {/* Style selector */}
                <Select value={selectedStyle} onValueChange={(val) => setSelectedStyle(val as CitationStyle)}>
                    <SelectTrigger
                        className="w-full"
                        style={{
                            backgroundColor: "var(--popup-highlight)",
                            borderColor: "var(--popup-border)",
                            color: "var(--popup-text)",
                        }}
                    >
                        <SelectValue placeholder="Select style"/>
                    </SelectTrigger>
                    <SelectContent>
                        {["Harvard", "APA7", "Chicago", "MLA8"].map((style) => (
                            <SelectItem key={style} value={style}>
                                {style}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Citations */}
                {currentCitation && (
                    <div className="flex flex-col gap-3">
                        {/* Full Citation */}
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">Full Citation:</span>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => handleCopy(currentCitation.fullText, "full")}
                                    style={{
                                        borderColor: copiedFull ? "oklch(65% 0.15 280)" : "var(--popup-border)",
                                        backgroundColor: copiedFull ? "oklch(90% 0.08 280)" : "var(--popup-highlight)",
                                        transition: "all 0.1s ease",
                                    }}
                                >
                                    <Copy
                                        className="w-4 h-4"
                                        style={{
                                            color: copiedFull ? "oklch(35% 0.12 280)" : "var(--popup-text)",
                                        }}
                                    />
                                </Button>
                            </div>
                            <div
                                className="text-sm p-2 border rounded break-words"
                                style={{
                                    backgroundColor: "var(--popup-highlight)",
                                    borderColor: "var(--popup-border)",
                                    color: "var(--popup-text)",
                                }}
                            >
                                {currentCitation.fullText}
                            </div>
                        </div>

                        {/* In-Text Citation */}
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">In-Text Citation:</span>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => handleCopy(currentCitation.inText, "inText")}
                                    style={{
                                        borderColor: copiedInText ? "oklch(65% 0.15 280)" : "var(--popup-border)",
                                        backgroundColor: copiedInText ? "oklch(90% 0.08 280)" : "var(--popup-highlight)",
                                        transition: "all 0.1s ease",
                                    }}
                                >
                                    <Copy
                                        className="w-4 h-4"
                                        style={{
                                            color: copiedInText ? "oklch(35% 0.12 280)" : "var(--popup-text)",
                                        }}
                                    />
                                </Button>
                            </div>
                            <div
                                className="text-sm p-2 border rounded break-words"
                                style={{
                                    backgroundColor: "var(--popup-highlight)",
                                    borderColor: "var(--popup-border)",
                                    color: "var(--popup-text)",
                                }}
                            >
                                {currentCitation.inText}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}