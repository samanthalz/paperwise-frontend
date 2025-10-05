"use client";

import {useMemo, useState} from "react";
import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Copy, X} from "lucide-react"; // ✅ X icon for close
import {CitationStyle, generateCitations} from "@/utils/citation";

type CitationPopupProps = {
    open: boolean;
    onCloseAction: () => void;
    title: string;
    authors: string[];
    arxivId: string;
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

    const handleCopy = (text: string) => navigator.clipboard.writeText(text);

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-[450px] max-w-full shadow-lg flex flex-col gap-4 relative">
                {/* Close button in top-right */}
                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={onCloseAction}
                >
                    <X className="w-5 h-5"/>
                </Button>

                <h2 className="text-lg font-semibold text-center">Generate Citation</h2>

                <Select value={selectedStyle} onValueChange={(val) => setSelectedStyle(val as CitationStyle)}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select style"/>
                    </SelectTrigger>
                    <SelectContent>
                        {["Harvard", "APA7", "Chicago", "MLA8"].map((style) => (
                            <SelectItem key={style} value={style}>{style}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {currentCitation && (
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">Full Citation:</span>
                                <Button size="icon" variant="outline"
                                        onClick={() => handleCopy(currentCitation.fullText)}>
                                    <Copy className="w-4 h-4"/>
                                </Button>
                            </div>
                            <div className="text-sm p-2 border rounded bg-gray-50 break-words">
                                {currentCitation.fullText}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">In-Text Citation:</span>
                                <Button size="icon" variant="outline"
                                        onClick={() => handleCopy(currentCitation.inText)}>
                                    <Copy className="w-4 h-4"/>
                                </Button>
                            </div>
                            <div className="text-sm p-2 border rounded bg-gray-50 break-words">
                                {currentCitation.inText}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
