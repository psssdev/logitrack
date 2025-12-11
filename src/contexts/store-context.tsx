'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Store } from '@/lib/types';
import { collection, query, where, addDoc, serverTimestamp, getDocs, doc, setDoc } from 'firebase/firestore';
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

  const storesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'stores'), where('ownerId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: storesFromDB, isLoading: isLoadingStores } = useCollection<Store>(storesQuery);
  const [stores, setStores] = useState<Store[]>([]);

  const isLoading = isUserLoadingAuth || isLoadingStores;

  useEffect(() => {
    async function initializeStores() {
        if (isLoading || !user || !firestore) return;

        let userStores = storesFromDB || [];
        const isSpecial = user.email === 'jiverson.t@gmail.com';

        if (isSpecial) {
             const defaultStore: Store = {
                id: '1',
                name: 'Loja Principal',
                ownerId: user.uid,
            };
            if (!userStores.some(s => s.id === '1')) {
                // To be safe, let's check if the doc exists before trying to create it
                const storeRef = doc(firestore, 'stores', '1');
                if (!(await getDocs(query(collection(firestore, 'stores'), where('__name__', '==', '1')))).docs.length) {
                    try {
                        await setDoc(storeRef, defaultStore);
                        userStores = [...userStores, defaultStore];
                    } catch (e) {
                        console.error("Failed to create default store:", e);
                    }
                } else {
                     if(!userStores.some(s => s.id === '1')) userStores.push(defaultStore);
                }
            }
        }
        
        setStores(userStores);

        // --- Selection Logic ---
        const savedStoreId = localStorage.getItem('selectedStoreId');
        let storeToSelect: Store | null = null;
        
        if(userStores.length > 0) {
            if (savedStoreId) {
                storeToSelect = userStores.find(s => s.id === savedStoreId) || null;
            }
            if (!storeToSelect && userStores.length === 1) {
                storeToSelect = userStores[0];
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
            if (userStores.length > 0) {
                 if (pathname !== '/selecionar-loja') {
                    router.replace('/selecionar-loja');
                 }
            } else if (userStores.length === 0 && !isSpecial) {
                // New regular user with no stores, maybe guide them to create one?
                // For now, redirecting to select store which will show an empty state.
                 if (pathname !== '/selecionar-loja') {
                    router.replace('/selecionar-loja');
                 }
            }
        }
    }
    
    initializeStores();

  }, [isLoading, user, firestore, storesFromDB, router, pathname, selectedStore]);


  const handleSelectStore = useCallback((store: Store) => {
    setSelectedStore(store);
    localStorage.setItem('selectedStoreId', store.id);
    router.replace('/inicio');
  }, [router]);
  
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
  
  if (!selectedStore && pathname !== '/selecionar-loja' && stores.length > 0) {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Logo className="h-10 w-10 animate-pulse" />
                <p className="text-muted-foreground">A redirecionar para a seleção de loja...</p>
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
