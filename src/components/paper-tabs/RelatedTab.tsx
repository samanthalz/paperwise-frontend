"use client";

import {Button} from "@/components/ui/button";
import {Activity} from "lucide-react";
import {useRouter} from "next/navigation";

export interface SemanticPaper {
    paperId: string;
    title: string;
    year?: number;
    abstract?: string;
    url?: string;
    externalIds?: { ArXiv?: string };
    openAccessPdf?: { url: string };
    authors?: { authorId: string; name: string }[];
    citationCount?: number;
}

interface RelatedTabProps {
    recommendations: SemanticPaper[];
    loading: boolean;
}

export default function RelatedTab({recommendations, loading}: RelatedTabProps) {
    useRouter();
    const renderPaper = (p: SemanticPaper, index: number) => {
        const arxivId = p.externalIds?.ArXiv;
        const pdfUrl = p.openAccessPdf?.url || (arxivId ? `https://arxiv.org/pdf/${arxivId}` : undefined);
        const link = p.url || (arxivId ? `https://arxiv.org/abs/${arxivId}` : undefined);

        const pubYear = p.year ? `Published Year: ${p.year}` : undefined;
        const authors = p.authors
            ? p.authors.slice(0, 3).map(a => a.name).join(", ") + (p.authors.length > 3 ? " et al." : "")
            : undefined;

        return (
            <div key={p.paperId || `${p.title}-${index}`} className="mb-6 p-4 border rounded-lg shadow-sm space-y-2">
                {/* Title */}
                <div className="font-bold text-blue-600">
                    {link ? (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {p.title}
                        </a>
                    ) : (
                        p.title
                    )}
                </div>

                {/* Abstract */}
                {p.abstract && (
                    <div className="text-sm text-gray-700 max-h-36 overflow-y-auto border p-2 rounded bg-gray-50">
                        {p.abstract}
                    </div>
                )}

                {/* Citation count */}
                {typeof p.citationCount === "number" && (
                    <div className="text-xs text-gray-500">Citations: {p.citationCount}</div>
                )}

                {/* Authors */}
                {authors && <div className="text-xs text-gray-400">Authors: {authors}</div>}

                <div className="flex items-center mt-1 w-full">
                    {pdfUrl && (
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:underline mr-4"
                        >
                            [PDF]
                        </a>
                    )}

                    {pubYear && <div className="text-xs text-gray-400">{pubYear}</div>}
                    <div className="ml-auto">
                        {arxivId && (
                            <a
                                href={`/${encodeURIComponent(arxivId)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Button
                                    size="sm"
                                    variant="default"
                                    className="flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()} // prevent event bubbling if inside clickable div
                                >
                                    Analyse <Activity className="w-4 h-4"/>
                                </Button>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="mt-2 text-sm mb-6 relative">
            {loading ? (
                <p className="mt-1 text-muted-foreground">Fetching Papers…</p>
            ) : recommendations.length === 0 ? (
                <p className="mt-1 text-muted-foreground">No recommendations found.</p>
            ) : (
                <ul className="list-disc pl-4 mt-1">{recommendations.map(renderPaper)}</ul>
            )}
        </div>
    );
}
