import { supabase } from './supabase';

// ============================================================================
// Image Compression Utilities
// ============================================================================

const MAX_IMAGE_WIDTH = 1920;
const IMAGE_QUALITY = 0.8;

/**
 * Compresses an image file before upload.
 * Resizes to max 1920px width and compresses to 0.8 quality.
 * @param file The image file to compress
 * @returns Compressed image as a Blob
 */
export async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
        }

        img.onload = () => {
            // Calculate new dimensions
            let width = img.width;
            let height = img.height;

            if (width > MAX_IMAGE_WIDTH) {
                height = Math.round((height * MAX_IMAGE_WIDTH) / width);
                width = MAX_IMAGE_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        console.log(`[Storage] Compressed image: ${file.size} → ${blob.size} bytes (${Math.round((1 - blob.size / file.size) * 100)}% reduction)`);
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to compress image'));
                    }
                },
                'image/jpeg',
                IMAGE_QUALITY
            );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Checks if a file is an image that can be compressed.
 */
function isCompressibleImage(file: File): boolean {
    return file.type.startsWith('image/') &&
        !file.type.includes('svg') &&
        !file.type.includes('gif');
}

// ============================================================================
// Upload Functions
// ============================================================================

/**
 * Uploads an image to Supabase Storage with automatic compression.
 * @param file The image file to upload
 * @param folder The folder path (e.g., 'attachments', 'avatars')
 * @param bucket The storage bucket (default: 'documents')
 * @returns The path of the uploaded file
 */
export async function uploadImage(
    file: File,
    folder: string,
    bucket: string = 'documents'
): Promise<string> {
    let uploadData: File | Blob = file;

    // Compress if it's a compressible image
    if (isCompressibleImage(file)) {
        try {
            uploadData = await compressImage(file);
        } catch (err) {
            console.warn('[Storage] Image compression failed, uploading original:', err);
            uploadData = file;
        }
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, uploadData, {
            contentType: file.type,
            upsert: false
        });

    if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw new Error('Failed to upload image');
    }

    return filePath;
}

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

/**
 * Uploads an image for use in quote/invoice templates.
 * Compresses the image, uploads to Supabase Storage, and returns the public URL.
 * @param file The image file to upload
 * @param organisationId The organisation ID for folder scoping
 * @returns The public URL of the uploaded image
 */
export async function uploadTemplateImage(
    file: File,
    organisationId: string
): Promise<string> {
    const filePath = await uploadImage(file, `template-images/${organisationId}`, 'documents');

    const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

    return data.publicUrl;
}
