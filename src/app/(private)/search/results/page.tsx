"use client";

import {useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {SidebarTrigger, useSidebar} from "@/components/ui/sidebar";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";

type ArxivPaper = {
    id: string;
    title: string;
    summary: string;
    authors: string[];
    published: string;
};

export default function SearchResultsPage() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("query") || "";
    const initialYear = searchParams.get("year") || "any";
    const initialSort = searchParams.get("sort") || "relevance";

    const router = useRouter();
    const supabase = createClientComponentClient();
    const {setOpen} = useSidebar();
    const [initialized, setInitialized] = useState(false);

    const [query, setQuery] = useState(initialQuery);
    const [year, setYear] = useState(initialYear);
    const [sort, setSort] = useState(initialSort);
    const [papers, setPapers] = useState<ArxivPaper[]>([]);
    const [loading, setLoading] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const [customRange, setCustomRange] = useState({start: "", end: ""});
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [appliedYearRange, setAppliedYearRange] = useState<string | null>(null);

    const [page, setPage] = useState(0);
    const RESULTS_PER_PAGE = 20;
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        if (!initialized) {
            setOpen(false);
            setInitialized(true);
        }
    }, [initialized, setOpen]);

    useEffect(() => {
        const checkSession = async () => {
            const {data} = await supabase.auth.getSession();
            setIsLoggedIn(!!data.session);
        };
        checkSession();
    }, [supabase]);

    const fetchArxivResults = async (
        reset = false,
        customRangeValue?: string | null
    ) => {
        if (!query.trim()) return;
        setLoading(true);

        try {
            let searchQuery = `(ti:${encodeURIComponent(query)}+OR+abs:${encodeURIComponent(
                query
            )})`;

            const effectiveRange = customRangeValue || appliedYearRange;
            if (year !== "any" || effectiveRange) {
                let startDate, endDate;

                if (effectiveRange) {
                    const [startYear, endYear] = effectiveRange.split("-");
                    startDate = `${startYear}01010000`;
                    endDate = `${endYear}12312359`;
                } else {
                    startDate = `${year}01010000`;
                    endDate = `${year}12312359`;
                }

                searchQuery += `+AND+submittedDate:[${startDate}+TO+${endDate}]`;
            }

            const sortBy = sort === "recent" ? "lastUpdatedDate" : "relevance";
            const start = reset ? 0 : page * RESULTS_PER_PAGE;

            const apiUrl = `https://export.arxiv.org/api/query?search_query=${searchQuery}&start=${start}&max_results=${RESULTS_PER_PAGE}&sortBy=${sortBy}&sortOrder=descending`;

            const res = await fetch(apiUrl);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const xmlText = await res.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "application/xml");

            const entries = xmlDoc.getElementsByTagName("entry");
            const parsedPapers: ArxivPaper[] = Array.from(entries).map((entry) => {
                const id = entry.getElementsByTagName("id")[0]?.textContent || "";
                const title =
                    entry.getElementsByTagName("title")[0]?.textContent?.trim() || "";
                const summary =
                    entry.getElementsByTagName("summary")[0]?.textContent?.trim() || "";
                const authors = Array.from(entry.getElementsByTagName("author")).map(
                    (a) => a.getElementsByTagName("name")[0]?.textContent || ""
                );
                const publishedRaw =
                    entry.getElementsByTagName("published")[0]?.textContent || "";
                const publishedYear = publishedRaw
                    ? new Date(publishedRaw).getFullYear().toString()
                    : "";

                return {id, title, summary, authors, published: publishedYear};
            });

            setPapers((prev) => (reset ? parsedPapers : [...prev, ...parsedPapers]));
            setHasMore(parsedPapers.length === RESULTS_PER_PAGE);
        } catch (err) {
            console.error("Error fetching arXiv data:", err);
            setPapers([]);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    };

    // Refetch when filters or query change (not in custom mode)
    useEffect(() => {
        if (year === "custom") return;
        setPage(0);
        fetchArxivResults(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, year, sort]);

    const handleSearch = () => {
        if (!query.trim()) return;
        const params = new URLSearchParams({query});
        if (year !== "any") params.append("year", year);
        if (sort) params.append("sort", sort);
        router.push(`/search/results?${params.toString()}`);
    };

    const handleLoadMore = () => {
        setPage((prev) => prev + 1);
    };

    useEffect(() => {
        if (page > 0) fetchArxivResults(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    return (
        <>
            {/* Search Box */}
            <div className="px-6 py-4 flex flex-col sm:flex-row items-center gap-2">
                {isLoggedIn && <SidebarTrigger/>}
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search papers..."
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch}>Search</Button>
            </div>

            {/* Filters */}
            <div className="px-6 py-2 flex flex-wrap gap-4 items-center">
                {/* Year Filter */}
                <div className="flex items-center gap-2">
                    <select
                        value={isCustomMode ? "custom" : year} // keep showing custom
                        onChange={(e) => {
                            const newValue = e.target.value;
                            setYear(newValue);
                            setIsCustomMode(newValue === "custom");

                            if (newValue !== "custom") {
                                setAppliedYearRange(null); // clear any custom range
                                const params = new URLSearchParams({query});
                                if (newValue !== "any") params.append("year", newValue);
                                if (sort) params.append("sort", sort);
                                router.push(`/search/results?${params.toString()}`);
                            }
                        }}
                        className="border rounded-md px-3 py-2 bg-white"
                    >
                        <option value="any">Any year</option>
                        <option value="2025">Since 2025</option>
                        <option value="2023">Since 2023</option>
                        <option value="2020">Since 2020</option>
                        <option value="2015">Since 2015</option>
                        <option value="custom">Custom range...</option>
                    </select>

                    {/* Custom Range Inputs */}
                    {isCustomMode && (
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                placeholder="Start year"
                                min="1900"
                                max="2100"
                                className="w-28"
                                value={customRange.start}
                                onChange={(e) =>
                                    setCustomRange((prev) => ({...prev, start: e.target.value}))
                                }
                            />
                            <span>–</span>
                            <Input
                                type="number"
                                placeholder="End year"
                                min="1900"
                                max="2100"
                                className="w-28"
                                value={customRange.end}
                                onChange={(e) =>
                                    setCustomRange((prev) => ({...prev, end: e.target.value}))
                                }
                            />
                            <Button
                                onClick={() => {
                                    if (!customRange.start || !customRange.end) return;
                                    const rangeString = `${customRange.start}-${customRange.end}`;
                                    setAppliedYearRange(rangeString);
                                    setPage(0);
                                    fetchArxivResults(true, rangeString); // ✅ pass immediately
                                }}
                            >
                                Apply
                            </Button>
                        </div>
                    )}
                </div>

                {/* Sort Filter */}
                <select
                    value={sort}
                    onChange={(e) => {
                        const newSort = e.target.value;
                        setSort(newSort);
                        const params = new URLSearchParams({query});
                        if (year !== "any") params.append("year", year);
                        if (newSort) params.append("sort", newSort);
                        router.push(`/search/results?${params.toString()}`);
                    }}
                    className="border rounded-md px-3 py-2 bg-white"
                >
                    <option value="relevance">Relevance</option>
                    <option value="recent">Most Recent</option>
                </select>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
                {loading && papers.length === 0 ? (
                    <p className="text-muted-foreground">Loading...</p>
                ) : papers.length > 0 ? (
                    <>
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
                                        By {paper.authors.join(", ")}{" "}
                                        {paper.published && (
                                            <span className="ml-2 text-xs text-gray-500">
                        ({paper.published})
                      </span>
                                        )}
                                    </p>
                                    <p className="text-sm text-foreground mt-1 line-clamp-2">
                                        {paper.summary}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Load More */}
                        {hasMore && (
                            <div className="flex justify-center mt-6">
                                <Button onClick={handleLoadMore} disabled={loading}>
                                    {loading ? "Loading..." : "Load More"}
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-muted-foreground">No results found.</p>
                )}
            </div>
        </>
    );
}
