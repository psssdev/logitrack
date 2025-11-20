'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/firebase/provider';
import type { User } from 'firebase/auth';

interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  companyId: string | null;
  role: string | null;
}

export const useUser = (): UserHookResult => {
  const auth = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsLoading] = useState<boolean>(true);
  const [userError, setUserError] = useState<Error | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = auth.onIdTokenChanged(async (firebaseUser) => {
      setIsLoading(true); // Always start in a loading state on change
      setUser(firebaseUser);
      setCompanyId(null);
      setRole(null);
      setUserError(null);

      if (firebaseUser) {
        try {
          let idTokenResult = await firebaseUser.getIdTokenResult();
          let claims = idTokenResult.claims;

          // If claims are missing, provision the user and get fresh claims
          if (!claims.companyId || !claims.role) {
            const response = await fetch('/api/provision-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
              },
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(
                errorData.error || 'Failed to provision user profile.'
              );
            }

            // Force refresh the token to get the new claims
            idTokenResult = await firebaseUser.getIdTokenResult(true);
            claims = idTokenResult.claims;
          }

          // Set state with the claims
          setCompanyId(claims.companyId as string);
          setRole(claims.role as string);

        } catch (error: any) {
          console.error('Error during user provisioning or token refresh:', error);
          setUserError(error);
        }
      }
      
      // Only set loading to false after all async operations are done
      setIsLoading(false);
    }, (error) => {
      console.error('Auth State Error:', error);
      setUserError(error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return {
    user,
    isUserLoading,
    userError,
    companyId,
    role,
  };
};
