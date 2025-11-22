'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Auth, User, onIdTokenChanged, signOut } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { FirestorePermissionError } from './errors';
import { errorEmitter } from './error-emitter';

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


// This function is now only responsible for determining the correct company and role
// It does NOT write to the database. The API endpoint handles that.
async function determineUserCompanyAndRole(
  firestore: Firestore,
  user: User
): Promise<{ companyId: string; role: string }> {
  const { uid, email, displayName } = user;
  if (!email) throw new Error("Email é obrigatório para o provisionamento.");

  const userRef = doc(firestore, 'users', uid);
  const userSnap = await getDoc(userRef).catch(error => {
      // Convert getDoc permission error into our custom error
      const permError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'get',
      });
      errorEmitter.emit('permission-error', permError);
      throw permError;
  });

  if (userSnap.exists()) {
    const userData = userSnap.data();
    if (userData.companyId && userData.role) {
      return { companyId: userData.companyId, role: userData.role };
    }
  }

  // Special case for the main owner
  if (email === 'athosguariza@gmail.com') {
    return { companyId: '1', role: 'admin' };
  }

  // Fallback for a truly new user: they will get a new company ID.
  // The server-side API will create the company document.
  // Here, we just generate the ID to be sent.
  const newCompanyRef = doc(collection(firestore, 'companies'));
  return { companyId: newCompanyRef.id, role: 'admin' };
}


// A new API call is needed to set the claims from the client-side logic
async function setClaimsAndProvisionProfileOnServer(idToken: string, claims: { companyId: string; role: string }) {
  const response = await fetch('/api/set-claims', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ claims }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to set custom claims.');
  }
}


/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<{
  children: ReactNode;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
}> = ({
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
          let idTokenResult = await firebaseUser.getIdTokenResult();
          let claims = idTokenResult.claims;

          // Se não houver claims, provisiona e define-os.
          if (!claims.companyId || !claims.role) {
             const userProfileData = await determineUserCompanyAndRole(firestore, firebaseUser);
             const idToken = await firebaseUser.getIdToken();
             
             // Server call to create profile and set claims
             await setClaimsAndProvisionProfileOnServer(idToken, userProfileData);
             
             // Força a atualização do token para obter os novos claims
             await firebaseUser.getIdToken(true); 
             
             // Recarrega a página para garantir que tudo seja reavaliado com os novos claims
             window.location.reload();
             // O return aqui impede que o setLoading(false) seja chamado antes do reload
             return;
          }
          
          // Se os claims existem, o utilizador está pronto
          setAuthState({
              user: firebaseUser,
              isUserLoading: false,
              userError: null,
              companyId: claims.companyId as string,
              role: claims.role as string,
          });

        } catch (error: any) {
            console.error('Error during user processing:', error);
            // Se o erro já for do tipo que queremos, apenas o emitimos e definimos.
            if (error instanceof FirestorePermissionError) {
                 setAuthState({ user: null, isUserLoading: false, userError: error, companyId: null, role: null });
                 errorEmitter.emit('permission-error', error);
            } else {
                 // Em caso de outro erro, força o logout para evitar loops e estado inconsistente
                signOut(auth);
                setAuthState({ user: null, isUserLoading: false, userError: error, companyId: null, role: null });
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

export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;

  if (!(memoized as MemoFirebase<T>).__memo) {
      (memoized as MemoFirebase<T>).__memo = true;
  }
  
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

export * from './auth/use-user';
