"use client";

import {useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {SidebarTrigger, useSidebar} from "@/components/ui/sidebar";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";
import {toast} from "sonner";

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
    const [applying, setApplying] = useState(false);

    const [page, setPage] = useState(0);
    const RESULTS_PER_PAGE = 10;
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
            // Build the raw search query
            let searchQuery = `(ti:"${query}" OR abs:"${query}")`;

            const effectiveRange = customRangeValue || appliedYearRange;
            if (year !== "any" || effectiveRange) {
                let startDate, endDate;
                console.log("inside")
                if (effectiveRange) {
                    const [startYear, endYear] = effectiveRange.split("-");
                    startDate = `${startYear}01010000`;
                    endDate = `${endYear}12312359`;
                } else {
                    const startYear = year;
                    const currentYear = new Date().getFullYear();
                    startDate = `${startYear}01010000`;
                    endDate = `${currentYear}12312359`;
                }

                // append raw date range
                searchQuery += ` AND submittedDate:[${startDate} TO ${endDate}]`;
            }

            // choose sort mode
            const sortBy = sort === "recent" ? "submittedDate" : "relevance";
            const start = reset ? 0 : page * RESULTS_PER_PAGE;
            const sortOrder = "descending";

            // Pass to API
            const params = new URLSearchParams({
                search_query: searchQuery,
                sortBy: sortBy,
                sortOrder: sortOrder,
                start: start.toString(),
                max_results: RESULTS_PER_PAGE.toString(),
            });

            const res = await fetch(`/api/arxiv?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch arXiv results");

            const xmlText = await res.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "application/xml");

            const entries = xmlDoc.getElementsByTagName("entry");
            const parsedPapers = Array.from(entries).map((entry) => ({
                id: entry.getElementsByTagName("id")[0]?.textContent || "",
                title: entry.getElementsByTagName("title")[0]?.textContent?.trim() || "",
                summary: entry.getElementsByTagName("summary")[0]?.textContent?.trim() || "",
                authors: Array.from(entry.getElementsByTagName("author")).map(
                    (a) => a.getElementsByTagName("name")[0]?.textContent || ""
                ),
                published:
                    new Date(
                        entry.getElementsByTagName("published")[0]?.textContent || ""
                    ).getFullYear().toString(),
            }));

            if (sort === "recent") {
                parsedPapers.sort((a, b) => b.published - a.published);
            }

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


    // Refetch when filters or query change
    useEffect(() => {
        if (year === "custom") {
            // If user already applied a custom range, use it
            if (appliedYearRange) {
                setPage(0);
                fetchArxivResults(true, appliedYearRange);
            }
            return;
        }

        // Normal year (any, since 2023, etc.)
        setPage(0);
        fetchArxivResults(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, sort]);

    const handleSearch = async () => {
        if (!query.trim()) return;

        // reset paging and run the search
        setPage(0);
        await fetchArxivResults(true);

        // update the URL
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
                        value={isCustomMode ? "custom" : year}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            setYear(newValue);
                            setIsCustomMode(newValue === "custom");

                            if (newValue !== "custom") {
                                // Clear all custom range states
                                setCustomRange({start: "", end: ""});
                                setAppliedYearRange(null);

                                // Normal behavior for non-custom years
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

                                    // Convert to numbers for validation
                                    const startYear = start ? parseInt(start) : 1900;
                                    const endYear = end ? parseInt(end) : currentYear;

                                    // Validate years are valid integers
                                    if (
                                        isNaN(startYear) ||
                                        isNaN(endYear) ||
                                        startYear < 1900 ||
                                        endYear > currentYear + 1
                                    ) {
                                        toast.error(`Please enter valid years between 1900 and ${currentYear}.`);
                                        return;
                                    }

                                    // Validate chronological order
                                    if (startYear > endYear) {
                                        toast.error("Start year cannot be after end year.");
                                        return;
                                    }

                                    setApplying(true); // show loading state

                                    const rangeString = `${startYear}-${endYear}`;
                                    setAppliedYearRange(rangeString);
                                    setPage(0);

                                    try {
                                        await fetchArxivResults(true, rangeString);
                                    } finally {
                                        setTimeout(() => setApplying(false), 600);
                                    }
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
                {/* Initial load (no papers yet) */}
                {loading && papers.length === 0 && (
                    <p className="text-muted-foreground text-center py-6">Loading...</p>
                )}

                {/* Results */}
                {papers.length > 0 && (
                    <>
                        <div className="space-y-4">
                            {papers.map((paper) => (
                                <div
                                    key={paper.id}
                                    className="p-4 rounded-lg border hover:bg-muted cursor-pointer transition-colors"
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
                )}

                {/* Empty results */}
                {!loading && papers.length === 0 && (
                    <p className="text-muted-foreground text-center py-6">
                        No results found.
                    </p>
                )}
            </div>
        </>
    );
}