'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { getSdks, initializeFirebase } from '@/firebase';

/**
 * Uploads a file to a specified path in Firebase Storage.
 *
 * @param file - The file to upload.
 * @param path - The storage path (e.g., 'logos' or 'driver_photos').
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export async function uploadFile(file: File, path: string): Promise<string> {
    const { storage } = getSdks(initializeFirebase().firebaseApp);
    if (!storage) {
        throw new Error("Firebase Storage is not initialized.");
    }
    
    // Generate a unique filename to prevent overwrites
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const fullPath = `${path}/${fileName}`;

    const storageRef = ref(storage, fullPath);

    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
}
