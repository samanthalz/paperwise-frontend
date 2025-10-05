// "use client";
//
// import {useEffect, useState} from "react";
// import {topbarClasses} from "@/components/topbars/topbar-base";
// import {SidebarTrigger, useSidebar} from "@/components/ui/sidebar";
// import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
// import {Button} from "@/components/ui/button";
// import {ArrowLeft, BookOpen, Edit} from "lucide-react";
//
// // Import tab components
// import SummaryTab from "@/components/paper-tabs/SummaryTab";
// import KeypointsTab from "@/components/paper-tabs/KeypointsTab";
// import AskPaperTab from "@/components/paper-tabs/AskPaperTab";
// import RelatedTab, {SemanticPaper} from "@/components/paper-tabs/RelatedTab";
// import {CitationPopup} from "@/components/citation-popup";
// import {AddPaperButton} from "@/components/add-paper-btn";
// import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";
// import {useRouter} from "next/navigation";
//
// type ArxivPaper = {
//     id: string;
//     title: string;
//     summary: string;
//     authors: string[];
//     published: string;
//     pdfUrl: string;
// };
//
// type Message = { role: "user" | "ai"; text: string };
//
// type PaperDetailContentProps = {
//     paperId: string;
// };
//
// export default function PaperDetailContent({paperId}: PaperDetailContentProps) {
//     const {setOpen} = useSidebar();
//     const router = useRouter();
//
//     const [paper, setPaper] = useState<ArxivPaper | null>(null);
//     const [loading, setLoading] = useState(false);
//     const [ingested, setIngested] = useState(false);
//     const [pdfId, setPdfId] = useState<string | null>(null);
//     const [messages, setMessages] = useState<Message[]>([]);
//     const [userPaperId, setUserPaperId] = useState<number | null>(null);
//     const [isSaved, setIsSaved] = useState(false);
//     const [showCitation, setShowCitation] = useState(false);
//     const [activeTab, setActiveTab] = useState<string>("summary");
//     const [isLoggedIn, setIsLoggedIn] = useState(false);
//     const [recommendations, setRecommendations] = useState<SemanticPaper[]>([]);
//     const [loadingRecommendations, setLoadingRecommendations] = useState(true);
//     const canonicalArxivId = paperId?.replace(/v\d+$/i, "");
//     const [processing, setProcessing] = useState(true);
//     const [checkpoint, setCheckpoint] = useState("Starting...");
//     const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
//
//     const supabase = createClientComponentClient();
//
//     /** Close sidebar on mount */
//     useEffect(() => {
//         setOpen(false);
//     }, [setOpen]);
//
//     /** Poll paper processing status */
//     useEffect(() => {
//         if (!pdfId) return;
//
//         const fetchStatus = async () => {
//             try {
//                 const res = await fetch(`/api/paper_status?pdfId=${pdfId}`);
//                 if (!res.ok) return;
//                 const data = await res.json();
//                 setProcessing(data.processing);
//                 setCheckpoint(data.checkpoint ?? "Starting...");
//             } catch (err) {
//                 console.error(err);
//             }
//         };
//
//         fetchStatus();
//         const interval = setInterval(fetchStatus, 2000);
//         return () => clearInterval(interval);
//     }, [pdfId]);
//
//     /** Fetch recommendations with caching */
//     useEffect(() => {
//         if (!canonicalArxivId) return;
//
//         const cached = sessionStorage.getItem(`recommendations_${canonicalArxivId}`);
//         if (cached) {
//             try {
//                 const parsed = JSON.parse(cached);
//                 const age = Date.now() - parsed.ts;
//                 if (age < CACHE_EXPIRY_MS) {
//                     setRecommendations(parsed.recommendations || []);
//                     setLoadingRecommendations(false);
//                     return;
//                 }
//             } catch (err) {
//                 console.error(err);
//             }
//         }
//
//         async function fetchSemanticData() {
//             try {
//                 const res = await fetch("http://127.0.0.1:8000/recommendations", {
//                     method: "POST",
//                     headers: {"Content-Type": "application/json"},
//                     body: JSON.stringify({arxiv_id: canonicalArxivId, limit: 10}),
//                 });
//                 const data = await res.json();
//                 console.log("Raw recommendation data:", data.recommendations);
//                 if (!res.ok) throw new Error(data.detail || "Failed to fetch recommendations");
//
//                 setRecommendations(data.recommendations || []);
//                 sessionStorage.setItem(
//                     `recommendations_${canonicalArxivId}`,
//                     JSON.stringify({recommendations: data.recommendations, ts: Date.now()})
//                 );
//             } catch (err) {
//                 console.error(err);
//             } finally {
//                 setLoadingRecommendations(false);
//             }
//         }
//
//         fetchSemanticData();
//     }, [canonicalArxivId]);
//
//     /** Check user session */
//     useEffect(() => {
//         const checkSession = async () => {
//             const {data} = await supabase.auth.getSession();
//             setIsLoggedIn(!!data.session);
//         };
//         checkSession();
//     }, [supabase]);
//
//     /** Fetch and ingest paper metadata */
//     useEffect(() => {
//         if (!paperId) return;
//
//         const fetchAndProcessPaper = async () => {
//             setLoading(true);
//             try {
//                 // Fetch metadata
//                 const apiUrl = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(paperId)}`;
//                 const res = await fetch(apiUrl);
//                 if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
//                 const xmlText = await res.text();
//                 const parser = new DOMParser();
//                 const xmlDoc = parser.parseFromString(xmlText, "application/xml");
//                 const entry = xmlDoc.getElementsByTagName("entry")[0];
//                 if (!entry) throw new Error("No entry found");
//
//                 const fullId = entry.getElementsByTagName("id")[0]?.textContent || "";
//                 const id = fullId.split("/abs/")[1] || "";
//                 const title = entry.getElementsByTagName("title")[0]?.textContent?.trim() || "";
//                 const summary = entry.getElementsByTagName("summary")[0]?.textContent?.trim() || "";
//                 const published = entry.getElementsByTagName("published")[0]?.textContent || "";
//                 const authors = Array.from(entry.getElementsByTagName("author")).map(
//                     (a) => a.getElementsByTagName("name")[0]?.textContent || ""
//                 );
//                 const links = Array.from(entry.getElementsByTagName("link"));
//                 const pdfUrl = links.find((l) => l.getAttribute("title") === "pdf")?.getAttribute("href") || "";
//
//                 const paperData: ArxivPaper = {id, title, summary, authors, published, pdfUrl};
//                 setPaper(paperData);
//
//                 // Send to backend for processing
//                 const ingestRes = await fetch("http://127.0.0.1:8000/process_pdf/", {
//                     method: "POST",
//                     headers: {"Content-Type": "application/json"},
//                     body: JSON.stringify({
//                         arxiv_id: paperData.id,
//                         arxiv_url: paperData.pdfUrl,
//                         title: paperData.title,
//                         summary: paperData.summary,
//                         authors: paperData.authors,
//                         published: paperData.published,
//                     }),
//                 });
//
//                 if (!ingestRes.ok) throw new Error(`Server error: ${ingestRes.status}`);
//                 const ingestData = await ingestRes.json();
//                 if (!ingestData.pdf_id) throw new Error("No pdf_id returned from backend");
//
//                 setPdfId(ingestData.pdf_id);
//                 setIngested(true);
//             } catch (err) {
//                 console.error("Error fetching or ingesting paper:", err);
//                 setMessages([{role: "ai", text: "Error: Failed to fetch or ingest paper."}]);
//             } finally {
//                 setLoading(false);
//             }
//         };
//
//         fetchAndProcessPaper();
//     }, [paperId]);
//
//     /** Clean up sessionStorage on unmount */
//     useEffect(() => {
//         return () => {
//             if (paper?.id) sessionStorage.removeItem(`askpaper_${paper.id}`);
//         };
//     }, [paper?.id]);
//
//     return (
//         <div className="flex flex-col h-screen overflow-hidden">
//             {/* Topbar */}
//             <div className={topbarClasses}>
//                 {isLoggedIn && <SidebarTrigger/>}
//                 <h1 className="text-base font-semibold flex-1">Paper Details</h1>
//                 <div className="flex gap-2">
//                     <Button
//                         className="flex items-center gap-1 rounded-lg px-3 py-1"
//                         onClick={() => router.back()}
//                     >
//                         <ArrowLeft className="w-4 h-4"/>
//                         Back
//                     </Button>
//                     <Button
//                         className="flex items-center gap-1 rounded-lg px-3 py-1"
//                         onClick={() => setShowCitation(true)}
//                     >
//                         <BookOpen className="w-4 h-4"/>
//                         Cite
//                     </Button>
//                     <Button className="flex items-center gap-1 rounded-lg px-3 py-1">
//                         <Edit className="w-4 h-4"/>
//                         Note
//                     </Button>
//                     {paper && pdfId && (
//                         <AddPaperButton
//                             pdfId={pdfId}
//                             messages={messages}
//                             onChangeAction={(id, saved) => {
//                                 setUserPaperId(id);
//                                 setIsSaved(saved);
//                             }}
//                         />
//                     )}
//                 </div>
//             </div>
//
//             {/* Main content */}
//             <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4 min-h-0 overflow-hidden">
//                 {/* PDF */}
//                 <div className="w-full h-full border rounded-lg overflow-hidden">
//                     {paper?.pdfUrl ? (
//                         <iframe src={paper.pdfUrl} className="w-full h-full" title="arXiv PDF"/>
//                     ) : (
//                         <p className="text-muted-foreground p-4">PDF not available.</p>
//                     )}
//                 </div>
//
//                 {/* Tabs */}
//                 <div className="border rounded-md shadow-sm flex flex-col h-full overflow-hidden">
//                     <Tabs value={activeTab} onValueChange={setActiveTab}
//                           className="flex flex-col h-full overflow-hidden">
//                         <TabsList
//                             className="shrink-0 mt-4 w-full justify-start rounded-none border-b bg-transparent p-0">
//                             {["summary", "keypoints", "ask", "related"].map((tab) => (
//                                 <TabsTrigger key={tab} value={tab} className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none focus-visible:ring-0
//                   data-[state=active]:border-b-blue-600
//                   data-[state=active]:text-blue-600
//                   data-[state=active]:shadow-none"
//                                 >
//                                     {tab === "summary"
//                                         ? "Summary"
//                                         : tab === "keypoints"
//                                             ? "Key Points"
//                                             : tab === "ask"
//                                                 ? "Ask Paper"
//                                                 : "Related Papers"}
//                                 </TabsTrigger>
//                             ))}
//                         </TabsList>
//
//                         <div className="flex-1 min-h-0 overflow-y-auto p-4">
//                             <TabsContent value="summary" className="h-full">
//                                 {paper && <SummaryTab paper={paper}/>}
//                             </TabsContent>
//                             <TabsContent value="keypoints" className="h-full">
//                                 {paper && <KeypointsTab arxivId={paper.id}/>}
//                             </TabsContent>
//                             <TabsContent value="ask" className="h-full flex flex-col">
//                                 {paper && (
//                                     <AskPaperTab
//                                         paper={paper}
//                                         pdfId={pdfId} // might be null while processing
//                                         messages={messages}
//                                         setMessagesAction={setMessages}
//                                         userPaperId={userPaperId}
//                                         isSaved={isSaved}
//                                         onUserPaperIdChangeAction={setUserPaperId}
//                                         processing={processing}
//                                         checkpoint={checkpoint}
//                                     />
//                                 )}
//                             </TabsContent>
//                             <TabsContent value="related" className="h-full flex flex-col">
//                                 <RelatedTab
//                                     recommendations={recommendations}
//                                     loading={loadingRecommendations}
//                                 />
//                             </TabsContent>
//                         </div>
//                     </Tabs>
//                 </div>
//             </div>
//
//             {paper && (
//                 <CitationPopup
//                     open={showCitation}
//                     onClose={() => setShowCitation(false)}
//                     title={paper.title}
//                     authors={paper.authors}
//                     arxivId={paper.id}
//                     publishedDate={paper.published}
//                 />
//             )}
//         </div>
//     );
// }

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

type ArxivPaper = {
    id: string;
    title: string;
    summary: string;
    authors: string[];
    published: string;
    pdfUrl: string;
};

type Message = { role: "user" | "ai"; text: string };

export default function PaperDetailContent({paperId}: { paperId: string }) {
    const {setOpen} = useSidebar();
    const router = useRouter();
    const supabase = createClientComponentClient();

    const [paper, setPaper] = useState<ArxivPaper | null>(null);
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
    const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

    const canonicalArxivId = paperId?.replace(/v\d+$/i, "");

    // --- Sidebar close on mount
    useEffect(() => setOpen(false), [setOpen]);

    // --- Check user session
    useEffect(() => {
        supabase.auth.getSession().then(({data}) => setIsLoggedIn(!!data.session));
    }, [supabase]);

    // --- Poll backend processing status
    useEffect(() => {
        if (!pdfId) return;

        const fetchStatus = async () => {
            try {
                const res = await fetch(`/api/paper_status?pdfId=${pdfId}`);
                if (!res.ok) return;
                const data = await res.json();
                setProcessing(data.processing);
                setCheckpoint(data.checkpoint ?? "Starting...");
            } catch (err) {
                console.error("Status fetch error:", err);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, [pdfId]);

    // --- Fetch related papers (with caching)
    useEffect(() => {
        if (!canonicalArxivId) return;

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
            } catch (err) {
                console.warn("Cache parse error:", err);
            }
        }

        const fetchSemanticData = async () => {
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

        fetchSemanticData();
    }, [CACHE_EXPIRY_MS, canonicalArxivId]);

    // --- Fetch and process paper metadata
    const fetchPaperData = useCallback(async () => {
        if (!paperId) return;

        try {
            const res = await fetch(
                `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(paperId)}`
            );
            if (!res.ok) throw new Error(`Failed to fetch arXiv data: ${res.status}`);

            const xmlText = await res.text();
            const xml = new DOMParser().parseFromString(xmlText, "application/xml");
            const entry = xml.querySelector("entry");
            if (!entry) throw new Error("No paper entry found in arXiv response");

            const fullId = entry.querySelector("id")?.textContent ?? "";
            const id = fullId.split("/abs/")[1] ?? "";
            const title = entry.querySelector("title")?.textContent?.trim() ?? "";
            const summary = entry.querySelector("summary")?.textContent?.trim() ?? "";
            const published = entry.querySelector("published")?.textContent ?? "";
            const authors = Array.from(entry.querySelectorAll("author name")).map((n) => n.textContent ?? "");
            const pdfUrl =
                Array.from(entry.querySelectorAll("link")).find((l) => l.getAttribute("title") === "pdf")?.getAttribute("href") ??
                "";

            const paperData: ArxivPaper = {id, title, summary, authors, published, pdfUrl};
            setPaper(paperData);

            // Send to backend for processing
            const ingestRes = await fetch("http://127.0.0.1:8000/process_pdf/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    arxiv_id: id,
                    arxiv_url: pdfUrl,
                    title,
                    summary,
                    authors,
                    published,
                }),
            });

            const ingestData = await ingestRes.json();
            if (!ingestRes.ok || !ingestData.pdf_id) throw new Error("Failed to process paper");

            setPdfId(ingestData.pdf_id);
        } catch (err) {
            console.error("Paper fetch error:", err);
            setMessages([{role: "ai", text: "Error: Failed to fetch or ingest paper."}]);
        }
    }, [paperId]);

    useEffect(() => {
        fetchPaperData();
        return () => {
            if (paper?.id) sessionStorage.removeItem(`askpaper_${paper.id}`);
        };
    }, [fetchPaperData, paper?.id]);

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
                    <Button className="flex items-center gap-1 rounded-lg px-3 py-1">
                        <Edit className="w-4 h-4"/> Note
                    </Button>
                    {paper && pdfId && (
                        <AddPaperButton
                            pdfId={pdfId}
                            messages={messages}
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
                    {paper?.pdfUrl ? (
                        <iframe src={paper.pdfUrl} className="w-full h-full" title="arXiv PDF"/>
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
                      data-[state=active]:text-blue-600"
                                >
                                    {label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <div className="flex-1 min-h-0 overflow-y-auto p-4">
                            <TabsContent value="summary">{paper && <SummaryTab paper={paper}/>}</TabsContent>
                            <TabsContent value="keypoints">{paper && <KeypointsTab arxivId={paper.id}/>}</TabsContent>
                            <TabsContent value="ask">
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
                            <TabsContent value="related">
                                <RelatedTab recommendations={recommendations} loading={loadingRecommendations}/>
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
                    authors={paper.authors}
                    arxivId={paper.id}
                    publishedDate={paper.published}
                />
            )}
        </div>
    );
}
