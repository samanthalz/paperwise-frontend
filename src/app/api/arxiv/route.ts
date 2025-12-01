import {NextRequest, NextResponse} from "next/server";

export async function GET(req: NextRequest) {
    try {
        const {searchParams} = new URL(req.url);
        const search_query = searchParams.get("search_query") || "";
        const sortBy = searchParams.get("sortBy") || "relevance";
        const sortOrder = searchParams.get("sortOrder") || "descending";
        const start = searchParams.get("start") || "0";
        const max_results = searchParams.get("max_results") || "25";

        if (!search_query) {
            return NextResponse.json({error: "Missing search_query"}, {status: 400});
        }

        // Encode the query
        const encodedQuery = search_query.replace(/\s+/g, '+');


        // Build arXiv API URL with all required parameters
        const apiUrl = `https://export.arxiv.org/api/query?search_query=${encodedQuery}&start=${start}&max_results=${max_results}&sortBy=${sortBy}&sortOrder=${sortOrder}`;

        console.log("arXiv API URL:", apiUrl);

        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`arXiv API responded with status: ${response.status}`);
        }

        const xmlData = await response.text();

        return new NextResponse(xmlData, {
            headers: {
                "Content-Type": "application/xml",
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (err) {
        console.error("arXiv fetch error:", err);
        return NextResponse.json(
            {error: "Failed to fetch from arXiv", details: err instanceof Error ? err.message : "Unknown error"},
            {status: 500}
        );
    }
}