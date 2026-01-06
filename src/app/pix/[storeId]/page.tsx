
'use client';
// This page is obsolete and will be removed. The new page is /pix/[storeId]/[keyId]
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DeprecatedPixPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/pix-config');
    }, [router]);

    return null;
}
