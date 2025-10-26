'use client';

import {useParams} from 'next/navigation';
import PaperDetailContent from '@/components/paper-detail/PaperDetailContent';

export default function PaperDetailPageWrapper() {
    const params = useParams();
    const paperId = Array.isArray(params.id) ? params.id[0] : params.id;

    if (!paperId) return <p>Paper ID not found.</p>;

    return <PaperDetailContent paperId={paperId}/>;
}
