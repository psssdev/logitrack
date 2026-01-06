'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Company } from '@/lib/types';
import { doc } from 'firebase/firestore';

const COMPANY_ID = '1';

interface CompanyContextType {
  company: Company | null;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const companyRef = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return doc(firestore, 'companies', COMPANY_ID);
  }, [firestore, user, isUserLoading]);

  const { data: company, isLoading } = useDoc<Company>(companyRef);

  return (
    <CompanyContext.Provider value={{ company, isLoading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
