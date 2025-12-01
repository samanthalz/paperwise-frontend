import {NextResponse} from "next/server";
import {GoogleGenerativeAI} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    const {question} = await req.json();

    try {
        const model = genAI.getGenerativeModel({model: "gemini-2.5-flash-preview-09-2025"});

        const stream = await model.generateContentStream(question);

        const encoder = new TextEncoder();
        const streamBody = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream.stream) {
                    const text = chunk.text();
                    if (text) controller.enqueue(encoder.encode(text));
                }
                controller.close();
            },
        });

        return new Response(streamBody, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
            },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({error: "Streaming failed"}, {status: 500});
    }
}
