'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Store } from '@/lib/types';
import { collection, query, where, addDoc, serverTimestamp, getDocs, doc, setDoc } from 'firebase/firestore';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';

interface StoreContextType {
  stores: Store[];
  selectedStore: Store | null;
  selectStore: (store: Store) => void;
  isLoading: boolean;
  createStore: (name: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const { user, isUserLoading: isUserLoadingAuth } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const storesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'stores'), where('ownerId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: storesFromDB, isLoading: isLoadingStores } = useCollection<Store>(storesQuery);
  const [stores, setStores] = useState<Store[]>(storesFromDB || []);

  const isLoading = isUserLoadingAuth || isLoadingStores;

   // Effect to sync stores from DB to state
  useEffect(() => {
    if (storesFromDB) {
      setStores(storesFromDB);
    }
  }, [storesFromDB]);


  useEffect(() => {
    if (isLoading || !user) return; // Wait until everything is loaded and user is confirmed

    const isSpecial = user.email === 'jiverson.t@gmail.com';
    let currentStores = storesFromDB || [];
    let shouldRedirectToSelect = false;

    // Special user logic: ensure default store exists
    if (isSpecial && !currentStores.some(s => s.id === '1')) {
      // It's possible the collection hook hasn't updated yet. We can't write and read in the same tick.
      // This logic will be handled by createStore if no stores are found.
    }

    const savedStoreId = localStorage.getItem('selectedStoreId');
    let storeToSelect: Store | null = null;
    
    if(currentStores.length > 0) {
        if (savedStoreId) {
            storeToSelect = currentStores.find(s => s.id === savedStoreId) || null;
        }
        // If no saved store, or saved store is invalid, and there's only one store, select it.
        if (!storeToSelect && currentStores.length === 1) {
            storeToSelect = currentStores[0];
        }
    }

    if (storeToSelect) {
        if (selectedStore?.id !== storeToSelect.id) {
            setSelectedStore(storeToSelect);
            localStorage.setItem('selectedStoreId', storeToSelect.id);
        }
        if (pathname === '/selecionar-loja') {
            router.replace('/inicio');
        }
    } else {
        // If no store can be selected, and we are not on the selection page, redirect.
         if (currentStores.length > 0 && pathname !== '/selecionar-loja') {
            shouldRedirectToSelect = true;
         }
         // If there are no stores, user should also be on the select page to create one
         if (currentStores.length === 0 && pathname !== '/selecionar-loja') {
            shouldRedirectToSelect = true;
         }
    }

    if(shouldRedirectToSelect) {
        router.replace('/selecionar-loja');
    }

  }, [isLoading, user, storesFromDB, router, pathname, selectedStore]);


  const handleSelectStore = useCallback((store: Store) => {
    setSelectedStore(store);
    localStorage.setItem('selectedStoreId', store.id);
    router.replace('/inicio');
  }, [router]);
  
  const createStore = useCallback(async (name: string) => {
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Utilizador não autenticado.' });
        throw new Error('User not authenticated');
    }
    try {
        const newStoreRef = await addDoc(collection(firestore, 'stores'), {
            name,
            ownerId: user.uid,
            createdAt: serverTimestamp(),
        });
        const newStore: Store = { id: newStoreRef.id, name, ownerId: user.uid };
        
        // This will update the local state, which triggers the useEffect to select it and redirect.
        setStores(prevStores => [...prevStores, newStore]);
        // Immediately select the new store
        handleSelectStore(newStore);
        
        toast({ title: 'Sucesso!', description: 'Loja criada e selecionada.' });
    } catch(error: any) {
        console.error("Error creating store: ", error);
        toast({ variant: 'destructive', title: 'Erro ao criar loja', description: error.message });
        throw error;
    }
  }, [firestore, user, toast, handleSelectStore]);

  // This is the "gatekeeper". It ensures that children are only rendered if a store is selected.
  // The pages that don't need a store (like /selecionar-loja) are not wrapped by this provider's children.
  if (!selectedStore && pathname !== '/selecionar-loja') {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Logo className="h-10 w-10 animate-pulse" />
                <p className="text-muted-foreground">{isLoading ? "A carregar..." : "A redirecionar..."}</p>
            </div>
        </div>
      );
  }


  return (
    <StoreContext.Provider value={{ stores, selectedStore, selectStore: handleSelectStore, isLoading, createStore }}>
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