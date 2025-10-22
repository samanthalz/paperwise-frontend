'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClientComponentClient} from '@supabase/auth-helpers-nextjs'
import {Card} from '@/components/ui/card'
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu'
import {Edit3, Folder, MoreVertical, Trash2} from 'lucide-react'
import Image from 'next/image'
import DocumentsTopbar from '@/components/topbars/documents-topbar'
import {useSidebar} from "@/components/ui/sidebar";
import {RenamePaperPopup} from "@/components/rename-paper-popup";
import {MovePaperPopup} from "@/components/move-paper-popup";
import {DeletePaperPopup} from "@/components/delete-paper-popup";


type Paper = {
    pdf_id: string;
    arxiv_id: string | null;
    title: string;
    date_added: string | null;
    saved_at: string;
    filename?: string;
    preview_url?: string | null;
    supabase_url?: string | null;
};

export default function Dashboard() {
    const supabase = createClientComponentClient()
    const router = useRouter()
    const [userId, setUserId] = useState<string | null>(null)
    const [papers, setPapers] = useState<Paper[]>([])
    const [loading, setLoading] = useState(true)
    const {setOpen} = useSidebar();
    const [initialized, setInitialized] = useState(false);
    // Dialog control states
    const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
    const [renameOpen, setRenameOpen] = useState(false);
    const [moveOpen, setMoveOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    useEffect(() => {
        if (!initialized) {
            setOpen(false);
            setInitialized(true);
        }
    }, [initialized, setOpen]);

    useEffect(() => {
        const fetchUserAndPapers = async () => {
            const {
                data: {user},
                error: userError
            } = await supabase.auth.getUser()

            if (userError || !user) {
                console.error('No user found or error:', userError)
                setLoading(false)
                return
            }

            setUserId(user.id)

            const {data, error} = await supabase
                .from('user_papers')
                .select(`
    *,
    papers!user_papers_pdf_id_fkey (
      pdf_id,
      title,
      arxiv_id,
      date_added,
      filename,
      thumbnail_url,
      supabase_url
    )
  `)
                .eq('user_id', user.id)


            if (error) {
                console.error('Error fetching user papers:', error.message)
                setLoading(false)
                return
            }

            if (data) {
                const formattedPapers = data.map((up) => ({
                    pdf_id: up.pdf_id,
                    title: up.papers?.title ?? (up.papers?.filename?.replace(/\.pdf$/i, '') ?? 'Untitled'),
                    arxiv_id: up.papers?.arxiv_id ?? 'Unknown',
                    date_added: up.papers?.date_added ?? null,
                    saved_at: up.saved_at,
                    filename: up.papers?.filename,
                    preview_url: up.papers?.thumbnail_url,
                    supabase_url: up.papers?.supabase_url
                }));

                setPapers(formattedPapers)
            }

            setLoading(false)
        }

        fetchUserAndPapers()
    }, [supabase])

    // --- Realtime subscription ---
    useEffect(() => {
        if (!userId) return;

        // 1️⃣ Subscribe to changes in user_papers
        const userPapersSub = supabase
            .channel('realtime-user-papers')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_papers',
                    filter: `user_id=eq.${userId}`,
                },
                async (payload) => {
                    console.log('User_papers change:', payload);
                    await refetchPapers(); // same refetch logic
                }
            )
            .subscribe();

        // 2️⃣ Subscribe to changes in papers (for title/thumbnail updates)
        const papersSub = supabase
            .channel('realtime-papers')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'papers',
                },
                async (payload) => {
                    const newRow = payload.new as { thumbnail_url?: string; title?: string; filename?: string };
                    console.log('Papers change:', newRow);

                    // Only refetch if visual info changed
                    if (newRow.thumbnail_url || newRow.title) {
                        await refetchPapers();
                    }
                }
            )
            .subscribe();

        // Shared refetch function
        const refetchPapers = async () => {
            const {data} = await supabase
                .from('user_papers')
                .select(`
        *,
        papers!user_papers_pdf_id_fkey (
          pdf_id,
          title,
          arxiv_id,
          date_added,
          filename,
          thumbnail_url,
          supabase_url
        )
      `)
                .eq('user_id', userId);

            if (data) {
                setPapers(
                    data.map((up) => ({
                        pdf_id: up.pdf_id,
                        title: up.papers?.title || up.papers?.filename?.replace(/\.pdf$/i, '') || 'Untitled',
                        arxiv_id: up.papers?.arxiv_id ?? 'Unknown',
                        date_added: up.papers?.date_added ?? null,
                        saved_at: up.saved_at,
                        filename: up.papers?.filename,
                        preview_url: up.papers?.thumbnail_url,
                        supabase_url: up.papers?.supabase_url,
                    }))
                );
            }
        };

        // Cleanup both
        return () => {
            supabase.removeChannel(userPapersSub);
            supabase.removeChannel(papersSub);
        };
    }, [supabase, userId]);

    const removePaper = async (pdfId: string) => {
        // Remove locally
        setPapers(prev => prev.filter(p => p.pdf_id !== pdfId));

        // Remove from Supabase
        try {
            const {error} = await supabase
                .from('papers')
                .delete()
                .eq('pdf_id', pdfId);

            if (error) throw error;

            // Optional: also remove from user_papers link table
            await supabase
                .from('user_papers')
                .delete()
                .eq('pdf_id', pdfId);
        } catch (err) {
            console.error('Failed to delete paper:', err);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Topbar */}
            <DocumentsTopbar onDuplicate={removePaper}/>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto px-6 ">

                <h2 className="mt-6 mb-2 text-lg font-semibold">Saved Papers</h2>
                {loading && <p>Loading papers...</p>}
                {!loading && papers.length === 0 && <p>No papers saved yet.</p>}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {papers.map((paper) => (
                        <Card
                            key={paper.pdf_id}
                            className="hover:shadow-lg transition-shadow relative flex flex-col"
                        >
                            {/* Thumbnail clickable */}
                            <div
                                className="w-full aspect-[4/3] relative overflow-hidden group cursor-pointer"
                                onClick={() => {
                                    console.log('Clicked paper:', paper);
                                    if (paper.arxiv_id && paper.arxiv_id.toLowerCase() !== 'unknown') {
                                        router.push(`/${paper.arxiv_id}`);
                                    } else if (paper.supabase_url) {
                                        router.push(`/${encodeURIComponent(paper.pdf_id)}`);

                                    } else {
                                        console.warn('No valid arxiv_id or supabase_url');
                                    }
                                }}

                            >
                                <Image
                                    src={paper.preview_url ?? '/placeholder-pdf.png'}
                                    alt={paper.title || 'PDF Preview'}
                                    fill
                                    className="object-cover rounded-t-md border-b transition-transform duration-300 group-hover:scale-110"
                                />
                            </div>

                            {/* Title + Menu */}
                            <div className="flex items-center justify-between p-2">
                                <span className="font-medium truncate max-w-[90%]">{paper.title}</span>

                                <DropdownMenu
                                    key={`menu-${paper.pdf_id}`}
                                    open={openMenuId === paper.pdf_id}
                                    onOpenChange={(isOpen) => setOpenMenuId(isOpen ? paper.pdf_id : null)}
                                >
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-1">
                                            <MoreVertical className="w-5 h-5 cursor-pointer text-gray-600"/>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            className="flex items-center gap-2"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setOpenMenuId(null);
                                                setSelectedPaper(paper);
                                                setRenameOpen(true);
                                            }}
                                        >
                                            <Edit3 className="w-4 h-4"/> Rename
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                            className="flex items-center gap-2"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setOpenMenuId(null);
                                                setSelectedPaper(paper);
                                                setMoveOpen(true);
                                            }}
                                        >
                                            <Folder className="w-4 h-4"/> Move to Folder
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                            className="flex items-center gap-2 text-red-600"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setOpenMenuId(null);
                                                setSelectedPaper(paper);
                                                setDeleteOpen(true);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4"/> Delete
                                        </DropdownMenuItem>

                                    </DropdownMenuContent>
                                </DropdownMenu>

                            </div>
                        </Card>
                    ))}
                </div>
            </div>
            {/* Dialogs */}
            {selectedPaper && (
                <>
                    <RenamePaperPopup
                        open={renameOpen}
                        onCloseAction={() => setRenameOpen(false)}
                        pdfId={selectedPaper.pdf_id}
                        currentTitle={selectedPaper.title}
                        onRenamedAction={(newTitle) => {
                            setPapers((prev) =>
                                prev.map((p) =>
                                    p.pdf_id === selectedPaper.pdf_id ? {...p, title: newTitle} : p
                                )
                            );
                        }}
                    />

                    <MovePaperPopup
                        pdfId={selectedPaper.pdf_id}
                        open={moveOpen}
                        folders={folders}
                        onCloseAction={() => setMoveOpen(false)}
                        onMovedAction={(folderId) => console.log("Moved to:", folderId)}
                    />

                    <DeletePaperPopup
                        open={deleteOpen}
                        onCloseAction={() => setDeleteOpen(false)}
                        pdfId={selectedPaper.pdf_id}
                        onDeletedAction={() => {
                            setPapers(prev => prev.filter(p => p.pdf_id !== selectedPaper.pdf_id));
                            setSelectedPaper(null); // <-- clear the selection
                        }}
                    />
                </>
            )}
        </div>
    )
}
