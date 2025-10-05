'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClientComponentClient} from '@supabase/auth-helpers-nextjs'
import {Card} from '@/components/ui/card'
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu'
import {Edit3, Folder, MoreVertical, Trash2} from 'lucide-react'
import Image from 'next/image'
import DocumentsTopbar from '@/components/topbars/documents-topbar'

type Paper = {
    pdf_id: string
    arxiv_id: string | null
    title: string
    date_added: string | null
    saved_at: string
    filename?: string
    preview_url?: string
}

export default function Dashboard() {
    const supabase = createClientComponentClient()
    const router = useRouter()
    const [userId, setUserId] = useState<string | null>(null)
    const [papers, setPapers] = useState<Paper[]>([])
    const [loading, setLoading] = useState(true)

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
          paper_details:papers!user_papers_pdf_id_fkey (
            pdf_id,
            title,
            arxiv_id,
            date_added,
            filename,
            thumbnail_url
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
                    title: up.paper_details?.title ?? 'Untitled',
                    arxiv_id: up.paper_details?.arxiv_id ?? 'Unknown',
                    date_added: up.paper_details?.date_added ?? null,
                    saved_at: up.saved_at,
                    filename: up.paper_details?.filename,
                    preview_url: up.paper_details?.thumbnail_url
                }))
                setPapers(formattedPapers)
            }

            setLoading(false)
        }

        fetchUserAndPapers()
    }, [supabase])

    return (
        <div className="flex flex-col h-full">
            {/* Topbar */}
            <DocumentsTopbar/>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
                {userId ? <p>User ID: {userId}</p> : <p>Loading user...</p>}

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
                                    if (paper.arxiv_id) router.push(`/${paper.arxiv_id}`)
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

                                <DropdownMenu>
                                    <DropdownMenuTrigger>
                                        <MoreVertical className="w-5 h-5 cursor-pointer text-gray-600"/>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem className="flex items-center gap-2">
                                            <Edit3 className="w-4 h-4"/> Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="flex items-center gap-2">
                                            <Folder className="w-4 h-4"/> Move to Folder
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="flex items-center gap-2 text-red-600">
                                            <Trash2 className="w-4 h-4"/> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
