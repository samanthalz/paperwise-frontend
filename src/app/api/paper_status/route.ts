import {NextRequest, NextResponse} from "next/server";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const pdfId = url.searchParams.get("pdfId");

    if (!pdfId) return NextResponse.json({processing: false, checkpoint: null});

    const supabase = createClientComponentClient();

    const {data: paper, error} = await supabase
        .from("papers")
        .select("processed, checkpoint")
        .eq("pdf_id", pdfId)
        .maybeSingle();

    if (error) console.error("Supabase error:", error);

    return NextResponse.json({
        processing: paper ? !paper.processed : false,
        checkpoint: paper?.checkpoint ?? null,
    });
}
