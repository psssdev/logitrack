'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Store } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

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
  const [isReady, setIsReady] = useState(false);

  // 1. Fetch stores available to the user
  const storesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    // For admin, fetch all stores. For other roles, filter by ownerId.
    if (role === 'admin') {
      return query(collection(firestore, 'stores'));
    }
    return query(collection(firestore, 'stores'), where('ownerId', '==', user.uid));
  }, [firestore, user?.uid, role]);

  const { data: stores, isLoading: isLoadingStores } = useCollection<Store>(storesQuery);

  // 2. Load selected store from localStorage on mount and when stores list changes
  useEffect(() => {
    if (!stores) return;
    const savedStoreId = localStorage.getItem('selectedStoreId');
    if (savedStoreId) {
      const store = stores.find(s => s.id === savedStoreId) || null;
      setSelectedStore(store);
    }
  }, [stores]);

  // 3. Main logic to handle loading state and redirection
  useEffect(() => {
    const isFirebaseReady = !isUserLoadingAuth && !isLoadingStores;
    
    if (!isFirebaseReady) {
      setIsReady(false);
      return;
    }

    // Firebase data has loaded
    setIsReady(true);
    
    if (stores && stores.length > 0) {
        // If there's a selected store and we are on the selection page, redirect away.
        if (selectedStore && pathname === '/selecionar-loja') {
            router.replace('/inicio');
            return;
        }

        // If there's no selected store, decide what to do
        if (!selectedStore) {
             // If only one store, select it automatically and redirect.
            if (stores.length === 1) {
                setSelectedStore(stores[0]!);
                localStorage.setItem('selectedStoreId', stores[0]!.id);
                 if (pathname === '/selecionar-loja') {
                    router.replace('/inicio');
                 }
            }
            // If multiple stores and no selection, force redirect to selection page.
            else if (pathname !== '/selecionar-loja') {
                router.replace('/selecionar-loja');
            }
        }
    }
    // If ready and there are no stores, do nothing, let the selection page show "no stores".

  }, [isUserLoadingAuth, isLoadingStores, stores, selectedStore, pathname, router]);

  const handleSelectStore = useCallback((store: Store) => {
    setSelectedStore(store);
    localStorage.setItem('selectedStoreId', store.id);
    router.push('/inicio');
  }, [router]);


  const isLoading = !isReady || isUserLoadingAuth || isLoadingStores;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">A carregar dados da aplicação...</p>
        </div>
      </div>
    );
  }
  
  if (isReady && !selectedStore && pathname !== '/selecionar-loja') {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">A redirecionar...</p>
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
