"use client";

import React, {useEffect, useRef, useState} from "react";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Send} from "lucide-react";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";

export type Message = { role: "user" | "ai"; text: string; dbId?: number };

type AskPaperTabProps = {
    paper: { id: string; pdfUrl: string };
    pdfId: string | null;
    messages: Message[];
    setMessagesAction: React.Dispatch<React.SetStateAction<Message[]>>;
    userPaperId?: number | null;
    isSaved?: boolean;
    onUserPaperIdChangeAction?: (id: number | null) => void;
    processing: boolean;
    checkpoint: string | null;
};

export default function AskPaperTab({
                                        paper,
                                        pdfId,
                                        messages,
                                        setMessagesAction,
                                        userPaperId: propUserPaperId,
                                        isSaved: propIsSaved,
                                        onUserPaperIdChangeAction,
                                        processing,
                                        checkpoint,
                                    }: AskPaperTabProps) {
    const supabase = createClientComponentClient();
    const [userPaperId, setUserPaperId] = useState<number | null>(propUserPaperId || null);
    const [isSaved, setIsSaved] = useState(propIsSaved || false);
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);

    const isSendingRef = useRef(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const aiMessageIndexRef = useRef<number | null>(null);

    /** Sync props from parent */
    useEffect(() => setUserPaperId(propUserPaperId || null), [propUserPaperId]);
    useEffect(() => {
        if (typeof propIsSaved === "boolean") setIsSaved(propIsSaved);
    }, [propIsSaved]);

    /** Load existing messages from DB or sessionStorage */
    useEffect(() => {
        const init = async () => {
            if (!pdfId) return;

            const {data: userData} = await supabase.auth.getUser();
            if (!userData?.user) return;

            const {data: existingPaper} = await supabase
                .from("user_papers")
                .select("id")
                .eq("user_id", userData.user.id)
                .eq("pdf_id", pdfId)
                .maybeSingle();

            if (existingPaper?.id) {
                setUserPaperId(existingPaper.id);
                setIsSaved(true);
                onUserPaperIdChangeAction?.(existingPaper.id);

                const {data: prevMessages, error} = await supabase
                    .from("paper_chats")
                    .select("id, role, message")
                    .eq("user_paper_id", existingPaper.id)
                    .order("id", {ascending: true});

                if (!error && prevMessages) {
                    const loaded = prevMessages.map((m) => ({role: m.role, text: m.message, dbId: m.id}));
                    setMessagesAction(loaded);
                }
                return;
            }

            const stored = sessionStorage.getItem(`askpaper_${paper.id}`);
            if (stored) setMessagesAction(JSON.parse(stored));
        };

        init();
    }, [pdfId, paper.id, supabase, setMessagesAction, onUserPaperIdChangeAction]);

    /** Persist locally if paper not saved */
    useEffect(() => {
        if (!isSaved) sessionStorage.setItem(`askpaper_${paper.id}`, JSON.stringify(messages));
    }, [messages, paper.id, isSaved]);

    /** Scroll to bottom on new messages */
    useEffect(() => {
        scrollRef.current?.scrollIntoView({behavior: "smooth"});
    }, [messages]);

    /** Handle sending question */
    const handleAsk = async () => {
        if (!question.trim() || isSendingRef.current || processing) return;
        isSendingRef.current = true;

        const currentQuestion = question;
        setQuestion("");
        setLoading(true);

        let aiIndex: number;
        setMessagesAction((prev) => {
            const userMsg: Message = {role: "user", text: currentQuestion};
            const aiPlaceholder: Message = {role: "ai", text: ""};
            const newMessages = [...prev, userMsg, aiPlaceholder];
            aiIndex = newMessages.length - 1;
            aiMessageIndexRef.current = aiIndex;
            return newMessages;
        });

        try {
            if (userPaperId) {
                const {error} = await supabase
                    .from("paper_chats")
                    .insert({
                        user_paper_id: userPaperId,
                        role: "user",
                        message: currentQuestion,
                    })
                    .select("id")
                    .single();
                if (error) console.error("Error saving user message:", error);
            }

            const backendUrl =
                process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

            const res = await fetch(`${backendUrl}/ask_stream/`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    pdf_id: pdfId,
                    question: currentQuestion,
                }),
            });

            if (!res.body) throw new Error("No response body");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let aiResponse = "";

            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                aiResponse += decoder.decode(value, {stream: true});

                setMessagesAction((prev) => {
                    const updated = [...prev];
                    if (aiIndex >= 0 && updated[aiIndex]) {
                        updated[aiIndex] = {role: "ai", text: aiResponse};
                    }
                    return updated;
                });
            }

            if (userPaperId) {
                const {error: aiError} = await supabase
                    .from("paper_chats")
                    .insert({
                        user_paper_id: userPaperId,
                        role: "ai",
                        message: aiResponse,
                    })
                    .select("id")
                    .single();
                if (aiError) console.error("Error saving AI message:", aiError);
            }
        } catch (err) {
            console.error(err);
            setMessagesAction((prev) => [...prev, {role: "ai", text: "Error: Could not fetch response."}]);
        } finally {
            setLoading(false);
            isSendingRef.current = false;
            aiMessageIndexRef.current = null;
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 gap-2">
            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-3 p-2 min-h-[150px]">
                    {processing && (
                        <div className="flex items-center justify-center">
                            <p className="text-sm text-gray-500 italic text-center">
                                Paper is being processed: {checkpoint || "Starting..."}
                            </p>
                        </div>
                    )}

                    {messages.length > 0 &&
                        messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`rounded-lg px-3 py-2 text-sm max-w-[75%] break-words whitespace-pre-line ${
                                        m.role === "user" ? "bg-blue-600 text-white text-right" : "bg-gray-200 text-gray-900 text-left"
                                    }`}
                                >
                                    {m.text}
                                </div>
                            </div>
                        ))
                    }

                    {loading && <p className="text-sm text-gray-500">Thinking...</p>}
                    <div ref={scrollRef}/>
                </div>
            </ScrollArea>

            {/* Input box always visible, disabled while processing */}
            <div className="flex-shrink-0 flex items-center gap-2 border rounded-lg p-2">
                <Textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={processing ? "Paper is being processed..." : "Ask a question about this paper..."}
                    className="flex-1 resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    rows={1}
                    disabled={processing}
                    onKeyDown={(e) => {
                        if (processing) {
                            e.preventDefault();
                            return;
                        }
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAsk();
                        }
                    }}
                />
                <Button onClick={handleAsk} size="icon" className="shrink-0" disabled={processing}>
                    <Send className="h-4 w-4"/>
                </Button>
            </div>
        </div>
    );
}
