'use client';

import React from 'react';
import Link from 'next/link';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Company } from '@/lib/types';
import { Logo } from './logo';
import { Skeleton } from './ui/skeleton';

const COMPANY_ID = '1';

export function CompanyBranding() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();

  const companyRef = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return doc(firestore, 'companies', COMPANY_ID);
  }, [firestore, isUserLoading]);

  const { data: company, isLoading } = useDoc<Company>(companyRef);

  return (
    <Link href="/" className="flex items-center gap-2 font-semibold">
      <Logo className="h-6 w-6" />
      {isLoading || isUserLoading ? (
        <Skeleton className="h-6 w-24" />
      ) : (
        <span>{company?.nomeFantasia || 'LogiTrack'}</span>
      )}
    </Link>
  );
}
