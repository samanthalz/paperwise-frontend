'use client';

import React, {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClientComponentClient} from '@supabase/auth-helpers-nextjs';
import {Card} from '@/components/ui/card';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Edit2, Edit3, Folder, MoreVertical, Trash2} from 'lucide-react';
import Image from 'next/image';
import DocumentsTopbar from '@/components/topbars/documents-topbar';
import {useSidebar} from '@/components/ui/sidebar';
import {RenamePaperPopup} from '@/components/rename-paper-popup';
import {MovePaperPopup} from '@/components/move-paper-popup';
import {DeletePaperPopup} from '@/components/delete-paper-popup';
import {DeleteFolderPopup} from '@/components/delete-folder-popup';
import {toast} from 'sonner';
import {RenameFolderPopup} from "@/components/rename-folder-popup";

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

type PaperCardProps = {
    key?: string;
    paper: Paper;
    openMenuId: string | null;
    setOpenMenuId: React.Dispatch<React.SetStateAction<string | null>>;
    setSelectedPaper: React.Dispatch<React.SetStateAction<Paper | null>>;
    setRenameOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setMoveOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setDeleteOpen: React.Dispatch<React.SetStateAction<boolean>>;
    router: ReturnType<typeof useRouter>;
};

// --- Paper card ---
function PaperCard({
                       paper,
                       openMenuId,
                       setOpenMenuId,
                       setSelectedPaper,
                       setRenameOpen,
                       setMoveOpen,
                       setDeleteOpen,
                       router,
                   }: PaperCardProps) {
    return (
        <Card className="hover:shadow-lg transition-shadow relative flex flex-col">
            <div
                className="w-full aspect-[4/3] relative overflow-hidden group cursor-pointer"
                onClick={() => {
                    const idToUse = paper.arxiv_id ?? paper.pdf_id;
                    router.push(`/dashboard/${encodeURIComponent(idToUse)}`);
                }}
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

// Dashboard
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
    const [renameFolderOpen, setRenameFolderOpen] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
    const moveInProgressRef = useRef<{ [pdfId: string]: string | null }>({});

    // Sidebar initially closed
    useEffect(() => {
        if (!initialized) {
            setOpen(false);
            setInitialized(true);
        }
    }, [initialized, setOpen]);

    //  Fetch user data
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
                .is('folder_id', null),
            supabase.from('folders').select('id, name').eq('user_id', user.id),
        ]);

        if (foldersRes.data) setFolders(foldersRes.data);

        if (papersRes.data) {
            const formatted = papersRes.data.map((up: any) => ({
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
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const activeFolderRef = useRef<Folder | null>(null);
    useEffect(() => {
        activeFolderRef.current = activeFolder;
    }, [activeFolder]);

    //  Realtime subscriptions
    useEffect(() => {
        if (!userId) return;

        //  Shared refetch function
        const refetchPapers = async () => {
            if (!userId) return;

            // If inside a folder, only fetch that folder's papers
            if (activeFolder) {
                await fetchFolderPapers(activeFolder.id);
                return;
            }

            // Otherwise main view
            const {data: papersRes, error} = await supabase
                .from('user_papers')
                .select(`
            *,
            papers!user_papers_pdf_id_fkey (
                pdf_id, title, arxiv_id, date_added, filename, thumbnail_url, supabase_url
            )
        `)
                .eq('user_id', userId)
                .is('folder_id', null);

            if (error) return;

            if (papersRes) {
                const formatted = papersRes.map((up: any) => ({
                    pdf_id: up.pdf_id,
                    title: up.papers?.title || up.papers?.filename?.replace(/\.pdf$/i, '') || 'Untitled',
                    arxiv_id: up.papers?.arxiv_id ?? null,
                    date_added: up.papers?.date_added ?? null,
                    saved_at: up.saved_at,
                    filename: up.papers?.filename,
                    preview_url: up.papers?.thumbnail_url,
                    supabase_url: up.papers?.supabase_url,
                }));

                setPapers(formatted);
            }

        };

        //  Subscribe to user_papers changes using postgres_changes
        const userPapersSub = supabase
            .channel('custom-user-papers-channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_papers',
                    filter: `user_id=eq.${userId}`
                },
                async (payload) => {
                    const pdfId = payload.new?.pdf_id;
                    if (pdfId && moveInProgressRef.current[pdfId]) {
                        const targetFolder = moveInProgressRef.current[pdfId]; // folder paper moved to
                        const currentFolder = activeFolderRef.current?.id ?? "root";

                        // If the paper was moved out of the current view, skip update entirely
                        if (targetFolder !== currentFolder) {
                            delete moveInProgressRef.current[pdfId];
                            return;
                        }

                        // Otherwise, remove tracking and allow update
                        delete moveInProgressRef.current[pdfId];
                    }

                    // Refetch only for current view
                    if (activeFolderRef.current) {
                        await fetchFolderPapers(activeFolderRef.current.id);
                    } else {
                        // main view
                        await fetchUserData();
                    }

                }
            )
            .subscribe();

        //  Subscribe to papers metadata changes
        const papersSub = supabase
            .channel('custom-papers-channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'papers'
                },
                async (payload) => {
                    console.log('Papers change detected:', payload);
                    // Refetch when papers metadata changes
                    await refetchPapers();
                }
            )
            .subscribe();

        // Cleanup both subscriptions
        return () => {
            userPapersSub.unsubscribe();
            papersSub.unsubscribe();
        };
    }, [supabase, userId]);


    //  Folder functions
    const fetchFolderPapers = async (folderId: string) => {
        if (!userId) return;
        const {data, error} = await supabase
            .from('user_papers')
            .select(`
        *,
        papers!user_papers_pdf_id_fkey (
          pdf_id, title, arxiv_id, filename, thumbnail_url, supabase_url
        )
      `)
            .eq('user_id', userId)
            .eq('folder_id', folderId);

        if (error) {
            console.error('Error fetching folder papers:', error);
            toast.error('Failed to load folder contents');
            return;
        }

        const formatted = (data ?? []).map((up: any) => ({
            pdf_id: up.pdf_id,
            title: up.papers?.title || up.papers?.filename || 'Untitled',
            filename: up.papers?.filename,
            preview_url: up.papers?.thumbnail_url,
            supabase_url: up.papers?.supabase_url,
            arxiv_id: up.papers?.arxiv_id || null,
            date_added: up.papers?.date_added || null,
            saved_at: up.created_at || null,
        }));
        setPapers(formatted);
    };

    const removePaper = async (pdfId: string) => {
        setPapers((prev) => prev.filter((p) => p.pdf_id !== pdfId));
        await supabase.from('user_papers').delete().eq('pdf_id', pdfId);
        if (activeFolder) await fetchFolderPapers(activeFolder.id);
        else await fetchUserData();
        await supabase.from('papers').delete().eq('pdf_id', pdfId);
    };

    const handleCreateFolder = (folder: Folder) => setFolders((prev) => [...prev, folder]);

    const openFolder = (folder: Folder) => {
        setActiveFolder(folder);
        setPapers([]);
        fetchFolderPapers(folder.id);
    };

    //  Render
    return (
        <div className="flex flex-col h-full">
            <DocumentsTopbar onDuplicate={removePaper} onCreateFolder={handleCreateFolder}/>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
                {!activeFolder ? (
                    <>
                        {/* Folder Grid */}
                        {folders.length > 0 && (
                            <div className="mt-6 mb-6 space-y-2">
                                <h2 className="text-sm font-semibold text-muted-foreground tracking-wide">Folders</h2>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                    {folders.map((folder, index) => (
                                        <Card
                                            key={folder.id || `folder-${index}`}
                                            className="relative group p-3 bg-card hover:bg-muted/60 transition-all duration-150 rounded-lg flex flex-col items-center justify-center"
                                        >
                                            <button onClick={() => openFolder(folder)}
                                                    className="flex flex-col items-center justify-center">
                                                <Folder className="w-7 h-7 text-amber-500"/>
                                                <p className="mt-1 text-xs font-medium text-center">{folder.name}</p>
                                            </button>

                                            {/* Rename button */}
                                            <button
                                                className="absolute top-1 right-7 p-1 rounded-full hover:bg-gray-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFolder(folder);
                                                    setRenameFolderOpen(true);
                                                }}
                                            >
                                                <Edit2 className="w-4 h-4 text-blue-600"/>
                                            </button>

                                            <button
                                                className="absolute top-1 right-1 p-1 rounded-full hover:bg-red-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
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

                        <h2 className="mt-6 mb-2 text-lg font-semibold">Saved Papers</h2>
                        {loading && <p>Loading papers...</p>}
                        {!loading && papers.length === 0 &&
                            <p className="text-sm text-muted-foreground">No papers saved yet.</p>}

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {papers.map((paper, index) => (
                                <PaperCard
                                    key={paper.pdf_id || paper.filename || `paper-${index}`}
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
                        <div className="pt-6">
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
                                <p className="text-sm text-muted-foreground mt-2">No files in this folder.</p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    {papers.map((paper, index) => (
                                        <PaperCard
                                            key={paper.pdf_id || paper.filename || `active-paper-${index}`}
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

            {/* Popups */}
            {selectedPaper && (
                <>
                    <RenamePaperPopup
                        open={renameOpen}
                        onCloseAction={() => setRenameOpen(false)}
                        pdfId={selectedPaper.pdf_id}
                        currentTitle={selectedPaper.title}
                        onRenamedAction={(newTitle) =>
                            setPapers((prev) =>
                                prev.map((p) => (!(selectedPaper) || p.pdf_id === selectedPaper.pdf_id ? {
                                    ...p,
                                    title: newTitle
                                } : p))
                            )
                        }
                    />

                    <MovePaperPopup
                        pdfId={selectedPaper.pdf_id}
                        open={moveOpen}
                        folders={folders}
                        currentFolderId={activeFolder?.id || null}
                        onCloseAction={() => setMoveOpen(false)}
                        onMovedAction={async (folderId) => {
                            if (!selectedPaper) return;

                            // Track move
                            moveInProgressRef.current[selectedPaper.pdf_id] = folderId ?? "root";
                            setPapers(prev => prev.filter(p => p.pdf_id !== selectedPaper.pdf_id));

                            setSelectedPaper(null);
                        }}
                    />

                    <DeletePaperPopup
                        open={deleteOpen}
                        onCloseAction={() => setDeleteOpen(false)}
                        pdfId={selectedPaper.pdf_id}
                        onDeletedAction={() => {
                            if (selectedPaper) {
                                setPapers((prev) => prev.filter((p) => p.pdf_id !== selectedPaper.pdf_id));
                            }
                            setSelectedPaper(null);
                        }}
                    />
                </>
            )}

            {selectedFolder && (
                <DeleteFolderPopup
                    folderId={selectedFolder.id}
                    folderName={selectedFolder.name}
                    open={deleteFolderOpen}
                    onCloseAction={() => setDeleteFolderOpen(false)}
                    onDeletedAction={async () => {
                        if (selectedFolder) {
                            setFolders((prev) => prev.filter((f) => f.id !== selectedFolder.id));
                        }
                        if (!(selectedFolder) || activeFolder?.id === selectedFolder.id) {
                            setActiveFolder(null);
                            await fetchUserData();
                        } else if (activeFolder) {
                            await fetchFolderPapers(activeFolder.id);
                        } else {
                            await fetchUserData();
                        }
                        setSelectedFolder(null);
                    }}
                />
            )}

            {selectedFolder && (
                <RenameFolderPopup
                    folderId={selectedFolder.id}
                    currentName={selectedFolder.name}
                    open={renameFolderOpen}
                    onCloseAction={() => setRenameFolderOpen(false)}
                    onRenamedAction={async (newName) => {
                        // Update local folder list
                        if (selectedFolder) {
                            setFolders((prev) =>
                                prev.map((f) =>
                                    f.id === selectedFolder.id ? {...f, name: newName} : f
                                )
                            );
                        }

                        // If the renamed folder is the active folder, update its name too
                        if (!(selectedFolder) || activeFolder?.id === selectedFolder.id) {
                            setActiveFolder((prev) => prev ? {...prev, name: newName} : null);
                        }

                        // Optionally refresh data
                        await fetchUserData();

                        setSelectedFolder(null);
                    }}
                />
            )}

        </div>
    );
}
