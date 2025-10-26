"use client";

import {useCallback, useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";
import {SidebarTrigger, useSidebar} from "@/components/ui/sidebar";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {toast} from "sonner";

type Props = {
    initialQuery: string;
    initialYear: string;
    initialSort: string;
};

type ArxivPaper = {
    id: string;
    title: string;
    summary: string;
    authors: string[];
    published: string;
};

export default function SearchResultsPageContent({initialQuery, initialYear, initialSort}: Props) {
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
    const [applying, setApplying] = useState(false);

    const [page, setPage] = useState(0);
    const RESULTS_PER_PAGE = 20;
    const [hasMore, setHasMore] = useState(true);

    // Sidebar initialization
    useEffect(() => {
        if (!initialized) {
            setOpen(false);
            setInitialized(true);
        }
    }, [initialized, setOpen]);

    // Check if user is logged in
    useEffect(() => {
        const checkSession = async () => {
            const {data} = await supabase.auth.getSession();
            setIsLoggedIn(!!data.session);
        };
        checkSession();
    }, [supabase]);

    // Fetch Arxiv results
    const fetchArxivResults = useCallback(
        async (reset = false, customRangeValue?: string | null) => {
            // If query is empty AND this is a manual search, do nothing
            if (!query.trim() && !customRangeValue && year === "any") return;

            setLoading(true);
            try {
                let searchQuery = `(ti:${encodeURIComponent(query)}+OR+abs:${encodeURIComponent(query)})`;

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
                    const title = entry.getElementsByTagName("title")[0]?.textContent?.trim() || "";
                    const summary = entry.getElementsByTagName("summary")[0]?.textContent?.trim() || "";
                    const authors = Array.from(entry.getElementsByTagName("author")).map(
                        (a) => a.getElementsByTagName("name")[0]?.textContent || ""
                    );
                    const publishedRaw = entry.getElementsByTagName("published")[0]?.textContent || "";
                    const publishedYear = publishedRaw ? new Date(publishedRaw).getFullYear().toString() : "";
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
        },
        [query, year, sort, page, appliedYearRange]
    );

    // Auto-fetch when year or sort changes
    useEffect(() => {
        if (year === "custom") return;
        setPage(0);
        fetchArxivResults(true);
    }, [year, sort, fetchArxivResults]);

    // Fetch next page
    useEffect(() => {
        if (page > 0) fetchArxivResults(false);
    }, [fetchArxivResults, page]);

    // Search button handler
    const handleSearch = async () => {
        if (!query.trim()) return;
        setPage(0);
        await fetchArxivResults(true);

        const params = new URLSearchParams({query});
        if (year !== "any") params.append("year", year);
        if (sort) params.append("sort", sort);
        router.push(`/search/results?${params.toString()}`);
    };

    const handleLoadMore = () => setPage((prev) => prev + 1);

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
                        value={isCustomMode ? "custom" : year}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            setYear(newValue);

                            if (newValue === "custom") {
                                setIsCustomMode(true);
                            } else {
                                // Switching from custom to a normal year
                                setIsCustomMode(false);
                                setAppliedYearRange(null);      // clear applied range
                                setCustomRange({start: "", end: ""}); // clear custom input boxes
                                setPage(0);
                                fetchArxivResults(true);        // fetch for the new year
                            }
                        }}
                        className="border rounded-md px-3 py-2 bg-white"
                    >
                        <option value="any">Any year</option>
                        <option value="2025">Since 2025</option>
                        <option value="2024">Since 2024</option>
                        <option value="2023">Since 2023</option>
                        <option value="2022">Since 2022</option>
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
                                onClick={async () => {
                                    const start = customRange.start.trim();
                                    const end = customRange.end.trim();
                                    const currentYear = new Date().getFullYear();

                                    if (!start && !end) {
                                        toast.error("Please enter at least a start or end year.");
                                        return;
                                    }

                                    setApplying(true);

                                    const startYear = start || "1900";
                                    const endYear = end || currentYear.toString();

                                    if (parseInt(startYear) > parseInt(endYear)) {
                                        toast.error("Start year cannot be after end year.");
                                        setApplying(false);
                                        return;
                                    }

                                    const rangeString = `${startYear}-${endYear}`;
                                    setAppliedYearRange(rangeString);
                                    setPage(0);
                                    await fetchArxivResults(true, rangeString);
                                    setTimeout(() => setApplying(false), 600);
                                }}
                                disabled={applying}
                                className={`relative transition-all duration-300 px-5 ${
                                    applying
                                        ? "bg-blue-400 cursor-wait"
                                        : "bg-blue-600 hover:bg-blue-700 shadow hover:shadow-blue-400/50"
                                } text-white font-medium rounded-md`}
                            >
                                {applying ? "Applying..." : "Apply"}
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
                        setPage(0);
                        fetchArxivResults(true);
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
                                            `/search/results/${encodeURIComponent(paper.id.split("/abs/").pop() || "")}`
                                        )
                                    }
                                >
                                    <h2 className="text-lg font-semibold">{paper.title}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        By {paper.authors.join(", ")}{" "}
                                        {paper.published &&
                                            <span className="ml-2 text-xs text-gray-500">({paper.published})</span>}
                                    </p>
                                    <p className="text-sm text-foreground mt-1 line-clamp-2">{paper.summary}</p>
                                </div>
                            ))}
                        </div>

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
