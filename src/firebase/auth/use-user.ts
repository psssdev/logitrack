'use client';

// This file is now a pass-through. The actual logic is centralized in src/firebase/provider.tsx.
// This simplifies the architecture and prevents race conditions.
// New code should import useUser directly from '@/firebase' or '@/firebase/provider'.

export { useUser } from '@/firebase/provider';
export type { UserHookResult } from '@/firebase/provider';
