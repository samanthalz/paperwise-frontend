'use client';

import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClientComponentClient} from '@supabase/auth-helpers-nextjs';
import {Card} from '@/components/ui/card';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Edit3, Folder, MoreVertical, Trash2} from 'lucide-react';
import Image from 'next/image';
import DocumentsTopbar from '@/components/topbars/documents-topbar';
import {useSidebar} from '@/components/ui/sidebar';
import {RenamePaperPopup} from '@/components/rename-paper-popup';
import {MovePaperPopup} from '@/components/move-paper-popup';
import {DeletePaperPopup} from '@/components/delete-paper-popup';
import {DeleteFolderPopup} from '@/components/delete-folder-popup';
import {toast} from 'sonner';

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

type Folder = {
    id: string;
    name: string;
};

// Subcomponent for individual paper card
function PaperCard({
                       paper,
                       openMenuId,
                       setOpenMenuId,
                       setSelectedPaper,
                       setRenameOpen,
                       setMoveOpen,
                       setDeleteOpen,
                       router,
                   }: any) {
    return (
        <Card className="hover:shadow-lg transition-shadow relative flex flex-col">
            <div
                className="w-full aspect-[4/3] relative overflow-hidden group cursor-pointer"
                onClick={() => router.push(`/${encodeURIComponent(paper.pdf_id)}`)}
            >
                <Image
                    src={paper.preview_url ?? '/placeholder-pdf.png'}
                    alt={paper.title || 'PDF Preview'}
                    fill
                    className="object-cover rounded-t-md border-b transition-transform duration-300 group-hover:scale-110"
                />
            </div>

            <div className="flex items-center justify-between p-2">
                <span className="font-medium truncate max-w-[90%]">{paper.title}</span>

                <DropdownMenu
                    key={`menu-${paper.pdf_id}`}
                    open={openMenuId === paper.pdf_id}
                    onOpenChange={(isOpen) => setOpenMenuId(isOpen ? paper.pdf_id : null)}
                >
                    <DropdownMenuTrigger asChild>
                        <button className="p-1">
                            <MoreVertical className="w-5 h-5 text-gray-600"/>
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={() => {
                                setSelectedPaper(paper);
                                setRenameOpen(true);
                                setOpenMenuId(null);
                            }}
                        >
                            <Edit3 className="w-4 h-4 mr-2"/> Rename
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => {
                                setSelectedPaper(paper);
                                setMoveOpen(true);
                                setOpenMenuId(null);
                            }}
                        >
                            <Folder className="w-4 h-4 mr-2"/> Move
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => {
                                setSelectedPaper(paper);
                                setDeleteOpen(true);
                                setOpenMenuId(null);
                            }}
                            className="text-red-600"
                        >
                            <Trash2 className="w-4 h-4 mr-2"/> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </Card>
    );
}

export default function Dashboard() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const {setOpen} = useSidebar();

    const [initialized, setInitialized] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [papers, setPapers] = useState<Paper[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
    const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
    const [renameOpen, setRenameOpen] = useState(false);
    const [moveOpen, setMoveOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [deleteFolderOpen, setDeleteFolderOpen] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
    const moveInProgressRef = useRef(false);

    // Sidebar initially closed
    useEffect(() => {
        if (!initialized) {
            setOpen(false);
            setInitialized(true);
        }
    }, [initialized, setOpen]);

    const fetchUserData = async () => {
        const {data: {user}} = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const [papersRes, foldersRes] = await Promise.all([
            supabase
                .from('user_papers')
                .select(`
        *,
        papers!user_papers_pdf_id_fkey (
          pdf_id, title, arxiv_id, date_added, filename, thumbnail_url, supabase_url
        )
      `)
                .eq('user_id', user.id)
                .is('folder_id', null), // root papers

            supabase.from('folders').select('id, name').eq('user_id', user.id),
        ]);

        if (foldersRes.data) setFolders(foldersRes.data);

        if (papersRes.data) {
            const formatted = papersRes.data.map((up) => ({
                pdf_id: up.pdf_id,
                title: up.papers?.title ?? up.papers?.filename?.replace(/\.pdf$/i, '') ?? 'Untitled',
                arxiv_id: up.papers?.arxiv_id ?? null,
                date_added: up.papers?.date_added ?? null,
                saved_at: up.saved_at,
                filename: up.papers?.filename,
                preview_url: up.papers?.thumbnail_url,
                supabase_url: up.papers?.supabase_url,
            }));
            setPapers(formatted);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    // --- Realtime subscription ---
    useEffect(() => {
        if (!userId) return;

        // 1️⃣ Subscribe to changes in user_papers
        const userPapersSub = supabase
            .channel('realtime-user-papers')
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "user_papers",
                    filter: `user_id=eq.${userId}`,
                },
                async (payload) => {
                    if (moveInProgressRef.current) return;

                    const newRow = payload.new as { folder_id?: string | null; pdf_id?: string };
                    const oldRow = payload.old as { folder_id?: string | null; pdf_id?: string };

                    const currentFolderId = activeFolder?.id ?? null;

                    // Handle when folder changes
                    if (newRow.folder_id !== oldRow.folder_id) {
                        // Paper moved out of current folder
                        if (currentFolderId && oldRow.folder_id === currentFolderId) {
                            setPapers((prev) => prev.filter((p) => p.pdf_id !== newRow.pdf_id));
                        }
                        // Paper moved into current folder
                        else if (currentFolderId && newRow.folder_id === currentFolderId) {
                            await fetchFolderPapers(currentFolderId);
                        }
                        // Paper moved to root, and we are currently at root
                        else if (!newRow.folder_id && !currentFolderId) {
                            await fetchUserData();
                        }
                    }
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

    // Fetch papers inside a folder
    const fetchFolderPapers = async (folderId: string) => {
        if (!userId) return;

        const {data, error} = await supabase
            .from('user_papers')
            .select(`
        *,
        papers!user_papers_pdf_id_fkey (
          pdf_id,
          title,
          arxiv_id,
          filename,
          thumbnail_url,
          supabase_url
        )
      `)
            .eq('user_id', userId)
            .eq('folder_id', folderId);

        if (error) {
            console.error('Error fetching folder papers:', error);
            toast.error('Failed to load folder contents');
            return;
        }

        const formatted: Paper[] = data?.map((up) => ({
            pdf_id: up.pdf_id,
            title: up.papers?.title || up.papers?.filename || 'Untitled',
            filename: up.papers?.filename,
            preview_url: up.papers?.thumbnail_url,
            supabase_url: up.papers?.supabase_url,
            arxiv_id: up.papers?.arxiv_id || null,
            date_added: up.papers?.date_added || null,
            saved_at: up.created_at || null,
        })) ?? [];

        setPapers(formatted);
    };

    // Delete paper
    const removePaper = async (pdfId: string) => {
        setPapers((prev) => prev.filter((p) => p.pdf_id !== pdfId));
        await supabase.from('user_papers').delete().eq('pdf_id', pdfId);
        await supabase.from('papers').delete().eq('pdf_id', pdfId);
    };

    // Folder creation
    const handleCreateFolder = (folder: Folder) => {
        setFolders((prev) => [...prev, folder]);
    };

    const openFolder = (folder: Folder) => {
        setActiveFolder(folder);
        setPapers([]);
        fetchFolderPapers(folder.id);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Topbar */}
            <DocumentsTopbar
                onDuplicate={removePaper}
                onCreateFolder={handleCreateFolder}
            />

            <div className="flex-1 overflow-y-auto px-6 pb-6">
                {/* Folder view or root view */}
                {!activeFolder ? (
                    <>
                        {/* Folder Grid */}
                        {folders.length > 0 && (
                            <div className="mt-6 mb-6 space-y-2">
                                <h2 className="text-sm font-semibold text-muted-foreground tracking-wide">
                                    Folders
                                </h2>

                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                    {folders.map((folder) => (
                                        <Card key={folder.id}
                                              className="relative group p-3 bg-card hover:bg-muted/60 transition-all duration-150 rounded-lg flex flex-col items-center justify-center">
                                            {/* Open folder button - small and clean */}
                                            <button
                                                onClick={() => openFolder(folder)}
                                                className="flex flex-col items-center justify-center ..."
                                            >
                                                <Folder className="w-7 h-7 text-amber-500 ..."/>
                                                <p className="mt-1 text-xs font-medium text-center ...">
                                                    {folder.name}
                                                </p>
                                            </button>


                                            {/* Delete folder button */}
                                            <button
                                                className="absolute top-1 right-1 p-1 rounded-full hover:bg-red-100"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // prevent opening folder
                                                    setSelectedFolder(folder);
                                                    setDeleteFolderOpen(true);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600"/>
                                            </button>
                                        </Card>

                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Root Papers */}
                        <h2 className="mt-6 mb-2 text-lg font-semibold">Saved Papers</h2>

                        {loading && <p>Loading papers...</p>}
                        {!loading && papers.length === 0 && (
                            <p className="text-sm text-muted-foreground">No papers saved yet.</p>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {papers.map((paper) => (
                                <PaperCard
                                    key={paper.pdf_id}
                                    paper={paper}
                                    openMenuId={openMenuId}
                                    setOpenMenuId={setOpenMenuId}
                                    setSelectedPaper={setSelectedPaper}
                                    setRenameOpen={setRenameOpen}
                                    setMoveOpen={setMoveOpen}
                                    setDeleteOpen={setDeleteOpen}
                                    router={router}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Inside folder view */}
                        <div className="pt-6"> {/* Add padding-top */}
                            <div className="flex items-center gap-2 mb-4">
                                <button
                                    onClick={async () => {
                                        setActiveFolder(null);
                                        await fetchUserData();
                                    }}
                                    className="flex items-center gap-2 border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
                                >
                                    ← Back
                                </button>
                                <h2 className="text-base font-semibold">{activeFolder.name}</h2>
                            </div>

                            {papers.length === 0 ? (
                                <p className="text-sm text-muted-foreground mt-2">
                                    No files in this folder.
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    {papers.map((paper) => (
                                        <PaperCard
                                            key={paper.pdf_id}
                                            paper={paper}
                                            openMenuId={openMenuId}
                                            setOpenMenuId={setOpenMenuId}
                                            setSelectedPaper={setSelectedPaper}
                                            setRenameOpen={setRenameOpen}
                                            setMoveOpen={setMoveOpen}
                                            setDeleteOpen={setDeleteOpen}
                                            router={router}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Paper dialogs */}
            {selectedPaper && (
                <>
                    <RenamePaperPopup
                        open={renameOpen}
                        onCloseAction={() => setRenameOpen(false)}
                        pdfId={selectedPaper.pdf_id}
                        currentTitle={selectedPaper.title}
                        onRenamedAction={(newTitle) =>
                            setPapers((prev) =>
                                prev.map((p) =>
                                    p.pdf_id === selectedPaper.pdf_id ? {...p, title: newTitle} : p
                                )
                            )
                        }
                    />

                    <MovePaperPopup
                        pdfId={selectedPaper.pdf_id}
                        open={moveOpen}
                        folders={folders}
                        onCloseAction={() => setMoveOpen(false)}
                        onMovedAction={async (folderId) => {
                            if (!selectedPaper) return;
                            moveInProgressRef.current = true; // mark start of manual move

                            setPapers(prev => prev.filter(p => p.pdf_id !== selectedPaper.pdf_id));

                            if (!folderId) {
                                // moved to root
                                if (!activeFolder) await fetchUserData();
                            } else if (activeFolder?.id === folderId) {
                                await fetchFolderPapers(folderId);
                            }

                            setTimeout(() => {
                                moveInProgressRef.current = false; // reset after a short delay
                            }, 1000);

                            setSelectedPaper(null);
                        }}
                    />

                    <DeletePaperPopup
                        open={deleteOpen}
                        onCloseAction={() => setDeleteOpen(false)}
                        pdfId={selectedPaper.pdf_id}
                        onDeletedAction={() => {
                            setPapers((prev) =>
                                prev.filter((p) => p.pdf_id !== selectedPaper.pdf_id)
                            );
                            setSelectedPaper(null);
                        }}
                    />
                </>
            )}

            {/* Folder delete popup */}
            {selectedFolder && (
                <DeleteFolderPopup
                    folderId={selectedFolder.id}
                    folderName={selectedFolder.name}
                    open={deleteFolderOpen}
                    onCloseAction={() => setDeleteFolderOpen(false)}
                    onDeletedAction={async () => {
                        setFolders((prev) => prev.filter((f) => f.id !== selectedFolder.id));

                        if (activeFolder?.id === selectedFolder.id) {
                            // If the deleted folder is currently open
                            setActiveFolder(null);
                            await fetchUserData(); // Refresh root papers
                        } else if (activeFolder) {
                            // If you're inside another folder
                            await fetchFolderPapers(activeFolder.id); // Refresh current folder contents
                        } else {
                            // At root level
                            await fetchUserData(); // Refresh root list
                        }

                        setSelectedFolder(null);
                    }}
                />
            )}
        </div>
    );
}
