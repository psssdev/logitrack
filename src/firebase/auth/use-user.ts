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
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isUserLoading, setIsLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onIdTokenChanged(async (firebaseUser) => {
      setIsLoading(true);
      setUser(firebaseUser);
      setCompanyId(null);
      setRole(null);

      if (firebaseUser) {
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult();
          const claims = idTokenResult.claims;

          if (claims.companyId && claims.role) {
            setCompanyId(claims.companyId as string);
            setRole(claims.role as string);
            setIsLoading(false);
          } else {
            // If claims are missing, it might be a new user.
            // Trigger provisioning.
            setIsProvisioning(true);
            try {
              const response = await fetch('/api/provision-user', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
                },
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to provision user profile.');
              }
              
              // After successful provisioning, force a token refresh to get new claims.
              const freshIdTokenResult = await firebaseUser.getIdTokenResult(true);
              const newClaims = freshIdTokenResult.claims;
              setCompanyId(newClaims.companyId as string);
              setRole(newClaims.role as string);

            } catch (provisionError: any) {
              console.error("User Provisioning Error:", provisionError);
              setUserError(provisionError);
            } finally {
              setIsProvisioning(false);
            }
          }
        } catch (error: any) {
          console.error("Error getting user token or claims:", error);
          setUserError(error);
        }
      }
      // Set loading to false only after all async operations are done
      setIsLoading(false);
    }, (error) => {
      console.error("Auth State Error:", error);
      setUserError(error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return { user, isUserLoading: isUserLoading || isProvisioning, userError, companyId, role };
};
