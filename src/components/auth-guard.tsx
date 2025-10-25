'use client';

import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, createContext, useContext, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Company } from '@/lib/types';
import { useDoc } from '@/firebase';

// 1. Create a context for the company data
const CompanyContext = createContext<{ company: Company | null; isLoading: boolean }>({
  company: null,
  isLoading: true,
});

// 2. Create a hook to use the company context
export const useCompany = () => useContext(CompanyContext);

// 3. Create a provider component that will fetch and provide the data
function CompanyProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const [companyRef, setCompanyRef] = useState<any>(null);

  useEffect(() => {
    if (firestore) {
      // For now, hardcode company ID '1'. In a multi-tenant app, this would be dynamic.
      setCompanyRef(doc(firestore, 'companies', '1'));
    }
  }, [firestore]);

  const { data: company, isLoading } = useDoc<Company>(companyRef);

  return (
    <CompanyContext.Provider value={{ company: company, isLoading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's still no user, redirect to login page.
    if (!isUserLoading && !user) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  // While checking for the user, show a full-screen loading spinner.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only if loading is complete AND a user exists, render the protected content
  // wrapped in the CompanyProvider.
  if (user) {
    return <CompanyProvider>{children}</CompanyProvider>;
  }

  // If there's no user and we are about to redirect, render nothing to avoid flicker.
  return null;
}
