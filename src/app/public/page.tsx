'use client';
// This page is obsolete and will be removed. 
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DeprecatedPixPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/encomendas'); // Redirect to a safe page
    }, [router]);

    return null;
}
