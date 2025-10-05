'use client';

import {useParams} from 'next/navigation';
import PaperDetailContent from '@/components/paper-detail/PaperDetailContent';

export default function DocumentsPaperDetailPage() {
    // const params = useParams();
    // const paperId = Array.isArray(params.id) ? params.id[0] : params.id;
    const params = useParams();
    const paperId = decodeURIComponent(params.id as string);

    if (!paperId) return <p>Paper ID not found.</p>;

    return <PaperDetailContent paperId={paperId}/>;
}