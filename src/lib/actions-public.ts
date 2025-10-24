'use server';

// IMPORTANT: This file is for server actions that should be publicly accessible.
// Do not import from '@/firebase' here, as it contains client-side code.
// Use getFirestoreServer for database access.

import { getFirestoreServer } from '@/firebase/server-init';

// Re-export getFirestoreServer so other public server actions can use it.
export { getFirestoreServer };
