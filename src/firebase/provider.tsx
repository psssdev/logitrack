'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc, writeBatch, collection, serverTimestamp } from 'firebase/firestore';
import { Auth, User, onIdTokenChanged, signOut } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'

// Combined state for the Firebase context
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  companyId: string | null;
  role: string | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  companyId: string | null;
  role: string | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// --- Funções de Provisionamento movidas para o Cliente ---

async function provisionUserProfile(
  firestore: Firestore,
  user: User
): Promise<{ companyId: string; role: string }> {
  const { uid, email, displayName } = user;
  if (!email) throw new Error("Email é obrigatório para o provisionamento.");

  const userRef = doc(firestore, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userData = userSnap.data();
    const companyId = userData.companyId;
    const role = userData.role;
    if (companyId && role) {
      console.log('User profile exists, claims should be present.');
      // O token deve ser atualizado no listener para refletir isso
      return { companyId, role };
    }
  }

  // Se o perfil não existe ou está incompleto, provisiona.
  console.log(`Provisioning new profile for user ${uid}...`);

  // Lógica especial para o proprietário
  if (email === 'athosguariza@gmail.com') {
    const fixedCompanyId = '1';
    const fixedRole = 'admin';
    await setDoc(userRef, {
      displayName: displayName || email,
      email,
      companyId: fixedCompanyId,
      role: fixedRole,
      createdAt: serverTimestamp(),
    }, { merge: true });
    console.log(`Owner provisioned into company ${fixedCompanyId}.`);
    throw new Error('PROVISION_RELOAD_REQUIRED');
  }

  // Lógica para novos utilizadores
  const batch = writeBatch(firestore);
  const newCompanyRef = doc(collection(firestore, 'companies'));

  batch.set(newCompanyRef, {
    nomeFantasia: `Empresa de ${displayName || 'Utilizador'}`,
    codigoPrefixo: 'LG',
    linkBaseRastreio: 'https://rastreio.com/',
    createdAt: serverTimestamp(),
  });

  const newUserRole = 'admin';
  batch.set(userRef, {
    displayName: displayName || email,
    email,
    companyId: newCompanyRef.id,
    role: newUserRole,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  console.log(`New user and company ${newCompanyRef.id} provisioned.`);
  throw new Error('PROVISION_RELOAD_REQUIRED');
}


/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  storage,
}) => {
  const [authState, setAuthState] = useState<Omit<FirebaseContextState, 'firebaseApp' | 'firestore' | 'auth' | 'storage'>>({
    user: null,
    isUserLoading: true,
    userError: null,
    companyId: null,
    role: null,
  });

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth || !firestore) {
      setAuthState(prev => ({ ...prev, isUserLoading: false, userError: new Error("Auth ou Firestore não disponíveis.") }));
      return;
    }

    setAuthState({ user: null, isUserLoading: true, userError: null, companyId: null, role: null });

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult();
          const claims = idTokenResult.claims;

          if (!claims.companyId || !claims.role) {
             console.log("Claims not found, attempting to provision profile...");
             await provisionUserProfile(firestore, firebaseUser);
             // O erro PROVISION_RELOAD_REQUIRED será apanhado abaixo
          } else {
             // Claims existem, utilizador está pronto
             setAuthState({
                user: firebaseUser,
                isUserLoading: false,
                userError: null,
                companyId: claims.companyId as string,
                role: claims.role as string,
            });
          }

        } catch (error: any) {
           if (error.message === 'PROVISION_RELOAD_REQUIRED') {
            console.log("Provisioning complete, reloading page to apply claims...");
            // Força o logout e recarrega a página para que o fluxo de login seja refeito com o novo perfil
            await signOut(auth);
            window.location.reload();
          } else {
            console.error('Error during user processing:', error);
            setAuthState({ user: firebaseUser, isUserLoading: false, userError: error, companyId: null, role: null });
          }
        }
      } else {
        // User is signed out
        setAuthState({ user: null, isUserLoading: false, userError: null, companyId: null, role: null });
      }
    }, (error) => {
      console.error('onIdTokenChanged error:', error);
      setAuthState({ user: null, isUserLoading: false, userError: error, companyId: null, role: null });
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp,
    firestore,
    auth,
    storage,
    ...authState,
  }), [firebaseApp, firestore, auth, storage, authState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};


/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth | null => {
  return useContext(FirebaseContext)?.auth ?? null;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore | null => {
  return useContext(FirebaseContext)?.firestore ?? null;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp | null => {
  return useContext(FirebaseContext)?.firebaseApp ?? null;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * @returns {UserHookResult} Object with user, isLoading, error, companyId, and role.
 */
export const useUser = (): UserHookResult => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider');
  }
  const { user, isUserLoading, userError, companyId, role } = context;
  return { user, isUserLoading, userError, companyId, role };
};