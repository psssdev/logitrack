'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's still no user, redirect to login page.
    if (!isUserLoading && !user) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

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
