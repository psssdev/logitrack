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
  const { user, isUserLoading: isUserLoadingAuth } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch stores available to the user
  const storesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    // For now, fetch all stores. Later, this could be filtered by user role/permissions.
    // e.g., where('ownerId', '==', user.uid)
    return query(collection(firestore, 'stores'));
  }, [firestore, user?.uid]);

  const { data: stores, isLoading: isLoadingStores } = useCollection<Store>(storesQuery);

  // 2. Load selected store from localStorage on mount
  useEffect(() => {
    const savedStoreId = localStorage.getItem('selectedStoreId');
    if (savedStoreId && stores) {
      const store = stores.find(s => s.id === savedStoreId) || null;
      setSelectedStore(store);
    }
  }, [stores]); // Run only when stores are loaded

  // 3. Main logic to handle loading state and redirection
  useEffect(() => {
    const isReady = !isUserLoadingAuth && !isLoadingStores;

    if (!isReady) {
      setIsLoading(true);
      return;
    }

    // If we have stores and a store is selected, we are good.
    if (selectedStore) {
      setIsLoading(false);
      // If user is on the selection page but already has a selection, move them to home
      if (pathname === '/selecionar-loja') {
        router.replace('/inicio');
      }
      return;
    }

    // If ready, but no store is selected yet
    if (isReady && !selectedStore) {
        // If there are stores available, redirect to selection page
        if (stores && stores.length > 0) {
            if (pathname !== '/selecionar-loja') {
                router.replace('/selecionar-loja');
            }
            setIsLoading(false); // Stop loading, let the selection page render
        } else {
            // No stores available for this user
            setIsLoading(false);
            // Here you could redirect to a "create store" page or show a message
            if (pathname !== '/criar-loja') {
                 // For now, just show a message on the current page
                 console.warn("Nenhuma loja encontrada para este utilizador.");
            }
        }
    }

  }, [isUserLoadingAuth, isLoadingStores, stores, selectedStore, pathname, router]);

  const handleSelectStore = useCallback((store: Store) => {
    setSelectedStore(store);
    localStorage.setItem('selectedStoreId', store.id);
    router.push('/inicio');
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">A carregar dados da loja...</p>
        </div>
      </div>
    );
  }
  
   // Don't render children if we are on the selection page but still don't have a store
  if (pathname === '/selecionar-loja' && !selectedStore) {
      // The selection page will be rendered by the router
      return null;
  }
  
  if (!selectedStore && stores && stores.length > 0) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">A redirecionar para a seleção de loja...</p>
            </div>
        </div>
      )
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
