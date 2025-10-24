'use client';

import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's still no user, redirect to login page.
    if (!isUserLoading && !user) {
      router.replace('/');
      return;
    }

    // If a user is logged in, ensure their profile document exists.
    // This is the "seeding" logic required by the security rules.
    if (firestore && user) {
      const userRef = doc(firestore, 'users', user.uid);
      getDoc(userRef).then((docSnap) => {
        if (!docSnap.exists()) {
          // Document doesn't exist, so create it with default values.
          // This is crucial for Firestore security rules to work.
          setDoc(userRef, {
            companyId: '1', // Default company ID (as a string)
            role: 'admin',      // Default role
            email: user.email,
            displayName: user.displayName || user.email,
          }).catch((error) => {
            console.error("Failed to create user profile document:", error);
          });
        }
      });
    }

  }, [user, isUserLoading, router, firestore]);

  // While checking for the user, show a full-screen loading spinner.
  // This prevents any child components from rendering and attempting to fetch data.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only if loading is complete AND a user exists, render the protected content.
  if (user) {
    return <>{children}</>;
  }

  // If there's no user and we are about to redirect, render nothing to avoid flicker.
  return null;
}
