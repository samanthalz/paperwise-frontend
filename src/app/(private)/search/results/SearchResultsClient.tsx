"use client";

import {useSearchParams} from "next/navigation";
import SearchResultsPageContent from "./SearchResultsPageContent";

export default function SearchResultsClient() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("query") || "";
    const initialYear = searchParams.get("year") || "any";
    const initialSort = searchParams.get("sort") || "relevance";

    return (
        <SearchResultsPageContent
            initialQuery={initialQuery}
            initialYear={initialYear}
            initialSort={initialSort}
        />
    );
}
