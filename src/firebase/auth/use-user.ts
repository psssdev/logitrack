'use client';

// This file is intentionally kept for backwards compatibility in case other files import from it.
// The actual logic has been moved to src/firebase/provider.tsx to solve race conditions.
// New code should import useUser directly from '@/firebase' or '@/firebase/provider'.

export { useUser } from '@/firebase/provider';
export type { UserHookResult } from '@/firebase/provider';
