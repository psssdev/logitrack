'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Store } from '@/lib/types';
import { collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
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

  const isSpecialUser = user?.email === 'jiverson.t@gmail.com';

  const storesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    // For admin/special user, we might want all stores, but let's stick to ownership for now
    // unless specified otherwise. The logic below handles the special case.
    return query(collection(firestore, 'stores'), where('ownerId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: storesFromDB, isLoading: isLoadingStores } = useCollection<Store>(storesQuery);
  const [stores, setStores] = useState<Store[]>([]);

  const isLoading = isUserLoadingAuth || isLoadingStores;

  useEffect(() => {
    async function initializeDefaultStore() {
        if (isSpecialUser && firestore && user) {
             const defaultStore: Store = {
                id: '1', // Hardcoded ID for the main store
                name: 'Loja Principal',
                ownerId: user.uid,
            };

            // Check if special user has any stores, if not, create the default one.
            // This logic assumes the special user might not have an explicit store in the DB yet.
            const userStores = storesFromDB || [];
            if (!userStores.some(s => s.ownerId === user.uid)) {
                 // To avoid re-creating it every time, you might want to check if doc '1' exists
                 // For now, let's just add it to the local state.
            }
            
            // Combine DB stores with the default one, ensuring no duplicates
            const combined = [...(storesFromDB || [])];
            if (!combined.some(s => s.id === defaultStore.id)) {
                 combined.push(defaultStore);
            }
            setStores(combined);

        } else {
            setStores(storesFromDB || []);
        }
    }
    initializeDefaultStore();
  }, [storesFromDB, isSpecialUser, firestore, user]);


  useEffect(() => {
    // Wait until loading is fully complete before making any decisions
    if (isLoading) {
      return;
    }

    const savedStoreId = localStorage.getItem('selectedStoreId');
    let storeToSelect: Store | null = null;

    if (savedStoreId) {
      storeToSelect = stores.find(s => s.id === savedStoreId) || null;
    }
    
    // If no valid saved store, but there's only one store available, auto-select it.
    if (!storeToSelect && stores.length === 1) {
      storeToSelect = stores[0];
    }
    
    // If a store has been determined, set it and handle redirection.
    if (storeToSelect) {
      if (selectedStore?.id !== storeToSelect.id) {
        setSelectedStore(storeToSelect);
        localStorage.setItem('selectedStoreId', storeToSelect.id);
      }
      if (pathname === '/selecionar-loja') {
        router.replace('/inicio');
      }
    } else {
      // If ready, but no store could be selected, and there are stores to choose from...
      if (stores.length > 0 && pathname !== '/selecionar-loja') {
        router.replace('/selecionar-loja');
      }
      // If there are no stores at all, the user might need to create one, or stay on a welcome page.
      // For now, we do nothing and let them see the current page (which might be an empty state).
    }

  }, [isLoading, stores, router, pathname, selectedStore]);


  const handleSelectStore = useCallback((store: Store) => {
    setSelectedStore(store);
    localStorage.setItem('selectedStoreId', store.id);
    router.replace('/inicio');
  }, [router]);
  
  // This screen shows while waiting for auth and initial store list.
  if (isLoading) {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Logo className="h-10 w-10 animate-pulse" />
                <p className="text-muted-foreground">A carregar dados da aplicação...</p>
            </div>
        </div>
     );
  }
  
  // This screen shows if we are ready but couldn't select a store, prompting a redirect.
  if (!selectedStore && pathname !== '/selecionar-loja' && stores.length > 0) {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Logo className="h-10 w-10 animate-pulse" />
                <p className="text-muted-foreground">A redirecionar...</p>
            </div>
        </div>
     );
  }

  return (
    <StoreContext.Provider value={{ stores, selectedStore, selectStore: handleSelectStore, isLoading }}>
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
