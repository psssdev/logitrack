'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onIdTokenChanged } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { Loader2 } from 'lucide-react';


async function provisionUser(idToken: string) {
  const response = await fetch('/api/provision-user', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to provision user.');
  }
}


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
            const idTokenResult = await firebaseUser.getIdTokenResult();
            const claims = idTokenResult.claims;

            // If claims are not present, call the server to set them
            if (!claims.companyId || !claims.role) {
                 await provisionUser(idTokenResult.token);
                 // Force a token refresh to get the new claims on the client.
                 // This will re-trigger this onIdTokenChanged listener with the new token.
                 await firebaseUser.getIdToken(true);
                 // We don't set state here; we wait for the listener to re-run with the correct claims.
                 return; 
            }
            
            // If we are here, claims are present on the token.
            setAuthState({
              user: firebaseUser,
              isUserLoading: false,
              userError: null,
              companyId: (claims.companyId as string) || null,
              role: (claims.role as string) || null,
            });

        } catch (error: any) {
            console.error('Error during user processing:', error);
            setAuthState({ user: null, isUserLoading: false, userError: error, companyId: null, role: null });
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
  
  // Render loading indicator until we have a definitive user state AND a companyId
  const showLoading = authState.isUserLoading || (authState.user && !authState.companyId);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {showLoading ? (
         <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
      ) : (
         children
      )}
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