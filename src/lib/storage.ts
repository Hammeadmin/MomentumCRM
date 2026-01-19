import { supabase } from './supabase';

/**
 * Uploads a signed document (PDF) to Supabase Storage.
 * @param file The file object to upload
 * @param folder The folder path (e.g., 'quotes' or 'invoices')
 * @returns The path of the uploaded file
 */
export async function uploadSignedDocument(file: File, folder: 'quotes' | 'invoices'): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

    if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw new Error('Failed to upload signed document');
    }

    return filePath;
}

/**
 * Gets a temporary public URL for a signed document.
 * @param path The file path in storage
 * @returns The URL string
 */
export async function getSignedDocumentUrl(path: string): Promise<string | null> {
    if (!path) return null;

    const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, 3600); // Valid for 1 hour

    return data?.signedUrl || null;
}
