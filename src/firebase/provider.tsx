'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { Auth, User, onIdTokenChanged } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { Loader2 } from 'lucide-react';
import { FirestorePermissionError } from './errors';

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

// This client-side function now handles provisioning
async function provisionUserProfile(db: Firestore, user: User): Promise<{ companyId: string, role: string, shouldReload: boolean }> {
  const { uid, email, displayName } = user;
  const userRef = doc(db, 'users', uid);

  try {
    const userDoc = await getDoc(userRef);

    if (userDoc.exists() && userDoc.data()?.companyId && userDoc.data()?.role) {
      // User profile already exists and is valid
      return {
        companyId: userDoc.data()?.companyId,
        role: userDoc.data()?.role,
        shouldReload: false,
      };
    }

    // --- NEW PROVISIONING LOGIC ---
    // If we are here, it means the user doc doesn't exist or is incomplete.
    const name = displayName || email?.split('@')[0] || 'Novo Usuário';

    // Specific override for your user to ensure you are admin of company '1'
    if (email === 'athosguariza@gmail.com' || email === 'jiverson.t@gmail.com') {
      await setDoc(userRef, {
        displayName: name,
        email,
        companyId: '1',
        role: 'admin',
      }, { merge: true });
      // We return shouldReload: true to force a token refresh and get claims on the client
      return { companyId: '1', role: 'admin', shouldReload: true };
    }

    // Standard flow for any other new user
    const companyRef = doc(collection(db, 'companies')); // Create a new company doc ref
    const batch = writeBatch(db);

    batch.set(companyRef, {
      id: companyRef.id,
      nomeFantasia: `Empresa de ${name}`,
      codigoPrefixo: 'TR',
      linkBaseRastreio: 'https://seusite.com/rastreio/',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const newRole = 'admin';
    batch.set(userRef, {
      displayName: name,
      email,
      companyId: companyRef.id,
      role: newRole,
    });

    await batch.commit();
     // We return shouldReload: true to force a token refresh and get claims on the client
    return { companyId: companyRef.id, role: newRole, shouldReload: true };

  } catch (error: any) {
    // This is a critical failure, we re-throw to be caught by the main logic
     const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'write', // Assumed operation
        requestResourceData: { uid, email }
     });
     console.error("Error during provisioning user profile:", permissionError);
     throw permissionError;
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
          // Provision user profile on the client if it doesn't exist.
          // This will also return the correct companyId and role.
          const { companyId, role, shouldReload } = await provisionUserProfile(firestore, firebaseUser);

          // After provisioning, the user might need a token refresh to get claims.
          // The simplest, most reliable way to ensure the whole app gets the new claims
          // is to reload the page.
          if (shouldReload) {
             // To be absolutely sure the claims are on the token for the next load,
             // we can force a refresh here, but the reload is the main goal.
             await firebaseUser.getIdToken(true);
             window.location.reload();
             return; // Don't proceed with setting state, page will reload
          }

          // If we are here, it means the user was already provisioned.
          // We can try to get claims from the token.
          const idTokenResult = await firebaseUser.getIdTokenResult();
          const claims = idTokenResult.claims;

          setAuthState({
              user: firebaseUser,
              isUserLoading: false,
              userError: null,
              companyId: (claims.companyId as string) || companyId,
              role: (claims.role as string) || role,
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

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {authState.isUserLoading ? (
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
