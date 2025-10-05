import {createRouteHandlerClient} from "@supabase/auth-helpers-nextjs";
import {cookies} from "next/headers";

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({cookies});
    const {userId, pdfId} = await req.json();

    const {error} = await supabase.from("user_papers").insert({
        user_id: userId,
        pdf_id: pdfId,
    });

    if (error) return new Response(JSON.stringify(error), {status: 400});

    return new Response(JSON.stringify({success: true}), {status: 200});
}
