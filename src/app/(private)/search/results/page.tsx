"use client";

import {useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {SidebarTrigger} from "@/components/ui/sidebar";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";

type ArxivPaper = {
    id: string;
    title: string;
    summary: string;
    authors: string[];
};

export default function SearchResultsPage() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("query") || "";
    const router = useRouter();
    const supabase = createClientComponentClient();

    const [query, setQuery] = useState(initialQuery);
    const [papers, setPapers] = useState<ArxivPaper[]>([]);
    const [loading, setLoading] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const {data} = await supabase.auth.getSession();
            setIsLoggedIn(!!data.session);
        };
        checkSession();
    }, [supabase]);

    useEffect(() => {
        if (!initialQuery) return;

        const fetchArxivResults = async () => {
            setLoading(true);
            try {
                const apiUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
                    initialQuery
                )}&start=0&max_results=10`;

                const res = await fetch(apiUrl);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

                const xmlText = await res.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "application/xml");

                const entries = xmlDoc.getElementsByTagName("entry");
                const parsedPapers: ArxivPaper[] = Array.from(entries).map((entry) => {
                    const id = entry.getElementsByTagName("id")[0]?.textContent || "";
                    const title = entry.getElementsByTagName("title")[0]?.textContent?.trim() || "";
                    const summary = entry.getElementsByTagName("summary")[0]?.textContent?.trim() || "";
                    const authors = Array.from(entry.getElementsByTagName("author")).map(
                        (a) => a.getElementsByTagName("name")[0]?.textContent || ""
                    );
                    return {id, title, summary, authors};
                });

                setPapers(parsedPapers);
            } catch (err) {
                console.error("Error fetching arXiv data:", err);
                setPapers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchArxivResults();
    }, [initialQuery]);

    const handleSearch = () => {
        if (query.trim()) {
            router.push(`/search/results?query=${encodeURIComponent(query)}`);
        }
    };

    return (
        <>
            {/* Search Box */}
            <div className="px-6 py-4 flex items-center gap-2">
                {isLoggedIn && <SidebarTrigger/>}
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search papers..."
                    className="flex-1"
                />
                <Button onClick={handleSearch}>Search</Button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
                {loading ? (
                    <p className="text-muted-foreground">Loading...</p>
                ) : papers.length > 0 ? (
                    <div className="space-y-4">
                        {papers.map((paper) => (
                            <div
                                key={paper.id}
                                className="p-4 rounded-lg border hover:bg-muted cursor-pointer"
                                onClick={() =>
                                    router.push(
                                        `/search/results/${encodeURIComponent(
                                            paper.id.split("/abs/").pop() || ""
                                        )}`
                                    )
                                }
                            >
                                <h2 className="text-lg font-semibold">{paper.title}</h2>
                                <p className="text-sm text-muted-foreground">
                                    By {paper.authors.join(", ")}
                                </p>
                                <p className="text-sm text-foreground mt-1 line-clamp-2">
                                    {paper.summary}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">No results found.</p>
                )}
            </div>
        </>
    );
}
