'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Company } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { useStore } from '@/contexts/store-context';


interface CompanyContextType {
  company: Company | null;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();
  const { selectedStore } = useStore();

  const companyRef = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return doc(firestore, 'stores', selectedStore.id, 'companySettings', 'default');
  }, [firestore, selectedStore]);

  const { data: company, isLoading: isLoadingCompany } = useDoc<Company>(companyRef);

  const isLoading = isUserLoading || isLoadingCompany || !selectedStore;

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
