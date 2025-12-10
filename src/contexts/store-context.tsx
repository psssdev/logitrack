'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Store } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';

interface StoreContextType {
  stores: Store[];
  selectedStore: Store | null;
  selectStore: (store: Store) => void;
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const { user, isUserLoading: isUserLoadingAuth, role } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  // 1. Fetch stores available to the user
  const storesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    if (role === 'admin') {
      return query(collection(firestore, 'stores'));
    }
    return query(collection(firestore, 'stores'), where('ownerId', '==', user.uid));
  }, [firestore, user?.uid, role]);

  const { data: stores, isLoading: isLoadingStores } = useCollection<Store>(storesQuery);

  // 2. Load selected store from localStorage on mount, then manage redirection
  useEffect(() => {
    if (isUserLoadingAuth || isLoadingStores) return;

    const savedStoreId = localStorage.getItem('selectedStoreId');
    let currentStore: Store | null = null;
    
    if (savedStoreId && stores) {
      currentStore = stores.find(s => s.id === savedStoreId) || null;
    }
    
    // Auto-select if there's only one store
    if (!currentStore && stores?.length === 1) {
        currentStore = stores[0]!;
    }
    
    setSelectedStore(currentStore);

    if (currentStore) {
        if (!localStorage.getItem('selectedStoreId') || localStorage.getItem('selectedStoreId') !== currentStore.id) {
            localStorage.setItem('selectedStoreId', currentStore.id);
        }
        if (pathname === '/selecionar-loja') {
            router.replace('/inicio');
        }
    } else if (stores && stores.length > 1) {
        if (pathname !== '/selecionar-loja') {
            router.replace('/selecionar-loja');
        }
    }
    
  }, [isUserLoadingAuth, isLoadingStores, stores, pathname, router]);

  const handleSelectStore = useCallback((store: Store) => {
    setSelectedStore(store);
    localStorage.setItem('selectedStoreId', store.id);
    router.push('/inicio');
  }, [router]);

  const isLoading = isUserLoadingAuth || isLoadingStores;

  if (isLoading || (!selectedStore && pathname !== '/selecionar-loja')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <Logo className="h-10 w-10 animate-pulse" />
            <p className="text-muted-foreground">A carregar dados da aplicação...</p>
        </div>
      </div>
    );
  }

  return (
    <StoreContext.Provider value={{ stores: stores || [], selectedStore, selectStore: handleSelectStore, isLoading }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore deve ser usado dentro de um StoreProvider');
  }
  return context;
}
