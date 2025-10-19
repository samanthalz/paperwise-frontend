"use client";

import {useCallback, useEffect, useState} from "react";
import {topbarClasses} from "@/components/topbars/topbar-base";
import {SidebarTrigger, useSidebar} from "@/components/ui/sidebar";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Button} from "@/components/ui/button";
import {ArrowLeft, BookOpen, Edit} from "lucide-react";
import SummaryTab from "@/components/paper-tabs/SummaryTab";
import KeypointsTab from "@/components/paper-tabs/KeypointsTab";
import AskPaperTab from "@/components/paper-tabs/AskPaperTab";
import RelatedTab, {SemanticPaper} from "@/components/paper-tabs/RelatedTab";
import {CitationPopup} from "@/components/citation-popup";
import {AddPaperButton} from "@/components/add-paper-btn";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";
import {useRouter} from "next/navigation";
import NotesPopup from "@/components/topbars/notes-popup";

type ArxivPaper = {
    id: string;
    title: string;
    summary: string;
    authors: string[];
    published: string;
    pdfUrl: string;
    supabaseUrl?: string;
};

type Message = { role: "user" | "ai"; text: string };

export default function PaperDetailContent({paperId}: { paperId: string }) {
    const {setOpen} = useSidebar();
    const [initialized, setInitialized] = useState(false);
    const router = useRouter();
    const supabase = createClientComponentClient();

    const [paper, setPaper] = useState<ArxivPaper | null>(null);
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [pdfId, setPdfId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [userPaperId, setUserPaperId] = useState<number | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [showCitation, setShowCitation] = useState(false);
    const [activeTab, setActiveTab] = useState("summary");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [recommendations, setRecommendations] = useState<SemanticPaper[]>([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(true);
    const [processing, setProcessing] = useState(true);
    const [checkpoint, setCheckpoint] = useState("Starting...");
    const [showNotes, setShowNotes] = useState(false);
    const pdfUrlToRender = signedUrl || paper?.pdfUrl || null;
    const CACHE_EXPIRY_MS = 60 * 60 * 1000;

    const canonicalArxivId = paperId.replace(/v\d+$/i, "");

    // --- Close sidebar on mount
    useEffect(() => {
        if (!initialized) {
            setOpen(false);
            setInitialized(true);
        }
    }, [initialized, setOpen]);

    // --- Check login
    useEffect(() => {
        supabase.auth.getSession().then(({data}) => setIsLoggedIn(!!data.session));
    }, [supabase]);

    const fetchUserPaper = useCallback(async (id: string) => {
        console.log("fetchUserPaper called with id:", id);
        try {
            const {data, error} = await supabase
                .from("papers")
                .select("supabase_url, title, authors, published, abstract")
                .eq("pdf_id", id)
                .single();

            if (error) {
                console.log("Supabase fetch error:", error);
                return false;
            }

            if (data?.supabase_url) {
                let finalSignedUrl = data.supabase_url;

                // Create signed URL first
                const match = data.supabase_url.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+)/);
                if (match) {
                    const bucket = match[1];
                    const path = match[2].split("?")[0];

                    const {data: signed, error: signedError} = await supabase
                        .storage
                        .from(bucket)
                        .createSignedUrl(path, 60 * 60);

                    if (!signedError) {
                        finalSignedUrl = signed.signedUrl;
                    }
                }

                // Batch all state updates
                setPaper({
                    id,
                    title: data.title,
                    authors: data.authors || [],
                    published: data.published || new Date().toISOString(),
                    summary: data.abstract || "",
                    pdfUrl: data.supabase_url,
                    supabaseUrl: data.supabase_url,
                });
                setPdfId(id);
                setSignedUrl(finalSignedUrl);

                return true;
            }

            return false;
        } catch (err) {
            console.error("Fetch user paper error:", err);
            return false;
        }
    }, [supabase]);

    // --- Fetch arXiv paper
    const fetchArxivPaper = useCallback(async () => {
        try {
            const res = await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(paperId)}`);
            if (!res.ok) throw new Error(`Failed to fetch arXiv: ${res.status}`);

            const xmlText = await res.text();
            const xml = new DOMParser().parseFromString(xmlText, "application/xml");
            const entry = xml.querySelector("entry");
            if (!entry) throw new Error("No entry found");

            const fullId = entry.querySelector("id")?.textContent ?? "";
            const id = fullId.split("/abs/")[1] ?? "";
            const title = entry.querySelector("title")?.textContent?.trim() ?? "";
            const summary = entry.querySelector("summary")?.textContent?.trim() ?? "";
            const published = entry.querySelector("published")?.textContent ?? "";
            const authors = Array.from(entry.querySelectorAll("author name")).map((n) => n.textContent ?? "");
            const pdfUrl = Array.from(entry.querySelectorAll("link"))
                .find((l) => l.getAttribute("title") === "pdf")
                ?.getAttribute("href") ?? "";

            setPaper({id, title, summary, authors, published, pdfUrl});

            // Send to backend
            const ingestRes = await fetch("http://127.0.0.1:8000/process_pdf/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({arxiv_id: id, arxiv_url: pdfUrl, title, summary, authors, published}),
            });

            const ingestData = await ingestRes.json();
            if (!ingestRes.ok || !ingestData.pdf_id) throw new Error("Failed to process paper");

            setPdfId(ingestData.pdf_id);
        } catch (err) {
            console.error("Fetch arXiv paper error:", err);
            setMessages([{role: "ai", text: "Error fetching or processing arXiv paper."}]);
        }
    }, [paperId]);

    // --- Initialize paper (user PDF or arXiv)
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            if (!paperId || !mounted) return;

            console.log("🔄 Starting paper initialization");
            setProcessing(true);

            const isUser = await fetchUserPaper(paperId);
            if (!isUser && mounted) {
                await fetchArxivPaper();
            }

            if (mounted) {
                setProcessing(false);
                console.log("✅ Paper initialization complete");
            }
        };

        init();

        return () => {
            mounted = false;
        };
    }, [paperId, fetchUserPaper, fetchArxivPaper]);

    // --- Poll arXiv processing
    useEffect(() => {
        if (!pdfId) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/paper_status?pdfId=${pdfId}`);
                if (!res.ok) return;
                const data = await res.json();
                setProcessing(data.processing);
                setCheckpoint(data.checkpoint ?? "Starting...");
            } catch (err) {
                console.error("Status poll error:", err);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [pdfId, paper?.supabaseUrl]);

    // --- Fetch recommendations for arXiv
    useEffect(() => {
        if (!canonicalArxivId) return;
        if (!paper) return;                // wait until paper is loaded
        if (paper.supabaseUrl) return;     // skip if supabaseUrl exists

        const cacheKey = `recommendations_${canonicalArxivId}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                const {recommendations, ts} = JSON.parse(cached);
                if (Date.now() - ts < CACHE_EXPIRY_MS) {
                    setRecommendations(recommendations || []);
                    setLoadingRecommendations(false);
                    return;
                }
            } catch {
            }
        }

        const fetchRecommendations = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/recommendations", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({arxiv_id: canonicalArxivId, limit: 10}),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || "Failed to fetch recommendations");

                setRecommendations(data.recommendations || []);
                sessionStorage.setItem(
                    cacheKey,
                    JSON.stringify({recommendations: data.recommendations, ts: Date.now()})
                );
            } catch (err) {
                console.error("Fetch recommendations error:", err);
            } finally {
                setLoadingRecommendations(false);
            }
        };

        fetchRecommendations();
    }, [CACHE_EXPIRY_MS, canonicalArxivId, paper]);


    // --- UI
    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {/* Topbar */}
            <div className={topbarClasses}>
                {isLoggedIn && <SidebarTrigger/>}
                <h1 className="text-base font-semibold flex-1">Paper Details</h1>
                <div className="flex gap-2">
                    <Button onClick={() => router.back()} className="flex items-center gap-1 rounded-lg px-3 py-1">
                        <ArrowLeft className="w-4 h-4"/> Back
                    </Button>
                    <Button onClick={() => setShowCitation(true)}
                            className="flex items-center gap-1 rounded-lg px-3 py-1">
                        <BookOpen className="w-4 h-4"/> Cite
                    </Button>
                    <Button onClick={() => setShowNotes(true)} className="flex items-center gap-1 rounded-lg px-3 py-1">
                        <Edit className="w-4 h-4"/> Note
                    </Button>
                    {paper && (
                        <AddPaperButton
                            pdfId={pdfId}
                            messages={messages}
                            disabled={!!paper.supabaseUrl}
                            onChangeAction={(id, saved) => {
                                setUserPaperId(id);
                                setIsSaved(saved);
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4 min-h-0 overflow-hidden">
                {/* PDF */}
                <div className="w-full h-full border rounded-lg overflow-hidden">
                    {pdfUrlToRender ? (
                        <iframe src={pdfUrlToRender} className="w-full h-full" title={paper?.title || "PDF"}/>
                    ) : (
                        <p className="text-muted-foreground p-4">PDF not available.</p>
                    )}
                </div>

                {/* Tabs */}
                <div className="border rounded-md shadow-sm flex flex-col h-full overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab}
                          className="flex flex-col h-full overflow-hidden">
                        <TabsList
                            className="shrink-0 mt-4 w-full justify-start rounded-none border-b bg-transparent p-0">
                            {[
                                {key: "summary", label: "Summary"},
                                {key: "keypoints", label: "Key Points"},
                                {key: "ask", label: "Ask Paper"},
                                {key: "related", label: "Related Papers"},
                            ].map(({key, label}) => (
                                <TabsTrigger
                                    key={key}
                                    value={key}
                                    className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none focus-visible:ring-0
                      data-[state=active]:border-b-blue-600
                      data-[state=active]:text-blue-600
                      data-[state=active]:shadow-none"
                                >
                                    {label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <div className="flex-1 min-h-0 overflow-y-auto p-4">
                            <TabsContent className="h-full flex flex-col" value="summary">
                                {paper && <SummaryTab paper={paper}/>}
                            </TabsContent>
                            <TabsContent className="h-full flex flex-col" value="keypoints">
                                {paper && pdfId && <KeypointsTab pdfId={pdfId}/>}
                            </TabsContent>
                            <TabsContent className="h-full flex flex-col" value="ask">
                                {paper && (
                                    <AskPaperTab
                                        paper={paper}
                                        pdfId={pdfId}
                                        messages={messages}
                                        setMessagesAction={setMessages}
                                        userPaperId={userPaperId}
                                        isSaved={isSaved}
                                        onUserPaperIdChangeAction={setUserPaperId}
                                        processing={processing}
                                        checkpoint={checkpoint}
                                    />
                                )}
                            </TabsContent>
                            <TabsContent className="h-full flex flex-col" value="related">
                                <RelatedTab
                                    recommendations={recommendations}
                                    loading={loadingRecommendations}
                                    hasSupabaseUrl={!!paper?.supabaseUrl}
                                />

                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>

            {paper && (
                <CitationPopup
                    open={showCitation}
                    onCloseAction={() => setShowCitation(false)}
                    title={paper.title}
                    authors={paper.authors ?? []}
                    arxivId={paper.id}
                    publishedDate={paper.published}
                />
            )}

            {showNotes && paper &&
                <NotesPopup open={showNotes} onCloseAction={() => setShowNotes(false)} pdfId={pdfId}/>}
        </div>
    );
}

