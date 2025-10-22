"use client";

import {Button} from "@/components/ui/button";
import {Activity, Info} from "lucide-react";
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

export default function RelatedTab({recommendations, loading, hasSupabaseUrl}: RelatedTabProps & {
    hasSupabaseUrl?: boolean
}) {
    useRouter();
    if (hasSupabaseUrl) {
        return (
            <div className="text-sm mb-6 relative">
                <p className="mt-1 text-muted-foreground">
                    This paper was uploaded manually and therefore does not have automatically generated related papers.
                    Related recommendations are available only for publications sourced from the arXiv repository.
                </p>
            </div>
        );
    }
    const renderPaper = (p: SemanticPaper, index: number) => {
        const arxivId = p.externalIds?.ArXiv;
        const pdfUrl = p.openAccessPdf?.url || (arxivId ? `https://arxiv.org/pdf/${arxivId}` : undefined);
        const link = p.url || (arxivId ? `https://arxiv.org/abs/${arxivId}` : undefined);

        const pubYear = p.year ? `Published Year: ${p.year}` : undefined;
        const authors = p.authors
            ? p.authors.slice(0, 3).map(a => a.name).join(", ") + (p.authors.length > 3 ? " et al." : "")
            : undefined;

        return (
            <div
                key={p.paperId || `${p.title}-${index}`}
                className="mb-6 p-4 border rounded-lg shadow-sm space-y-2"
                style={{
                    backgroundColor: "var(----editor-bg)",
                    borderColor: "var(--popup-border)",
                    color: "var(--popup-text)",
                }}
            >
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
                    <div
                        className="text-sm text-gray-700 max-h-36 overflow-y-auto border p-2 rounded"
                        style={{
                            backgroundColor: "var(--popup-bg)",
                            borderColor: "var(--popup-border)",
                            color: "var(--popup-text)",
                        }}
                    >
                        {p.abstract}
                    </div>
                )}

                {/* Metadata section */}
                <div className="flex items-end justify-between mt-2 w-full">
                    {/* Left info (citations, authors, year) */}
                    <div className="flex flex-col text-xs text-gray-500 space-y-1">
                        {typeof p.citationCount === "number" && (
                            <div>
                                <span className="font-medium text-gray-700">Citation Count:</span>{" "}
                                <span className="italic text-gray-600">{p.citationCount.toLocaleString()}</span>
                            </div>
                        )}

                        {authors && (
                            <div>
                                <span className="font-medium text-gray-700">Authors:</span>{" "}
                                <span className="italic text-gray-600">{authors}</span>
                            </div>
                        )}

                        {p.year && (
                            <div>
                                <span className="font-medium text-gray-700">Published Year:</span>{" "}
                                <span className="italic text-gray-600">{p.year}</span>
                            </div>
                        )}
                    </div>

                    {/* Right side - Analyse button */}
                    {arxivId && (
                        <a
                            href={`/${encodeURIComponent(arxivId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-4 self-end"
                        >
                            <Button
                                size="sm"
                                variant="default"
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Analyse <Activity className="w-4 h-4"/>
                            </Button>
                        </a>
                    )}
                </div>

            </div>
        );
    };

    return (
        <div className="text-sm mb-6 relative">
            {loading ? (
                <p className="mt-1 text-muted-foreground">Fetching Papers…</p>
            ) : recommendations.length === 0 ? (
                <p className="mt-1 text-muted-foreground">No recommendations found.</p>
            ) : (
                <>
                    {/* 🔹 Info note */}
                    <div
                        className="mb-3 flex items-start gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 p-2 rounded-md">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5"/>
                        <span>
                            Only papers from <span className="font-medium text-blue-600">arXiv</span> include the
                            “Analyse” button. Other papers can be opened via their title on Semantic Scholar.
                        </span>
                    </div>

                    <ul className="list-disc pl-4 mt-1">{recommendations.map(renderPaper)}</ul>
                </>
            )}
        </div>
    );
}
