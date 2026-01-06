'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Store } from '@/lib/types';
import { collection, query, where, addDoc, serverTimestamp, doc } from 'firebase/firestore';
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

  const isSpecialUser = user?.email === 'jiverson.t@gmail.com';

  const storesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'stores'), where('ownerId', '==', user.uid));
  }, [firestore, user?.uid]);

  const specialUserDefaultStoreQuery = useMemoFirebase(() => {
    if (!firestore || !isSpecialUser) return null;
    return query(collection(firestore, 'stores'), where('__name__', '==', '1'));
  }, [firestore, isSpecialUser]);
  
  const { data: storesFromDB, isLoading: isLoadingStores } = useCollection<Store>(storesQuery);
  const { data: specialStore, isLoading: isLoadingSpecialStore } = useCollection<Store>(specialUserDefaultStoreQuery);

  const stores = React.useMemo(() => {
    const allStores = new Map<string, Store>();
    if (storesFromDB) {
      storesFromDB.forEach(s => allStores.set(s.id, s));
    }
    if (isSpecialUser && specialStore) {
      specialStore.forEach(s => allStores.set(s.id, s));
    }
    return Array.from(allStores.values());
  }, [storesFromDB, specialStore, isSpecialUser]);

  const isLoading = isUserLoadingAuth || isLoadingStores || isLoadingSpecialStore;

  useEffect(() => {
    if (isLoading || !user) return; 

    const savedStoreId = localStorage.getItem('selectedStoreId');
    let storeToSelect: Store | null = null;
    
    if(stores.length > 0) {
        if (savedStoreId) {
            storeToSelect = stores.find(s => s.id === savedStoreId) || null;
        }
        
        if (!storeToSelect && stores.length === 1) {
            storeToSelect = stores[0];
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
        if (pathname !== '/selecionar-loja') {
            router.replace('/selecionar-loja');
        }
    }

  }, [isLoading, user, stores, router, pathname, selectedStore]);


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
        const newDocRef = await addDoc(collection(firestore, 'stores'), {
            name,
            ownerId: user.uid,
            createdAt: serverTimestamp(),
        });
        const newStore: Store = { id: newDocRef.id, name, ownerId: user.uid };
        
        // Let the useCollection hook update the `stores` list naturally.
        // Immediately select the new store to trigger redirection.
        handleSelectStore(newStore);
        
        toast({ title: 'Sucesso!', description: 'Loja criada e selecionada.' });
    } catch(error: any) {
        console.error("Error creating store: ", error);
        toast({ variant: 'destructive', title: 'Erro ao criar loja', description: error.message });
        throw error;
    }
  }, [firestore, user, toast, handleSelectStore]);

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
