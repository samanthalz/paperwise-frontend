import {NextResponse} from "next/server";

export async function GET(req: Request) {
    const {searchParams} = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return new NextResponse("Missing paper ID", {status: 400});

    const apiUrl = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`;

    try {
        const res = await fetch(apiUrl);
        const text = await res.text();
        return new NextResponse(text, {status: 200});
    } catch (err) {
        return new NextResponse("Error fetching arXiv paper", {status: 500});
    }
}