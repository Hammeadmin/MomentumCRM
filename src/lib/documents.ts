import { supabase } from './supabase';
import type { UserProfile } from '../types/database';

export type DocumentCategory = 'Policys' | 'Mallar' | 'Utbildning' | 'Rutiner' | 'Övrigt';
export type UserRole = 'admin' | 'sales' | 'worker';

export interface Document {
  id: string;
  organisation_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  file_type?: string | null;
  category: DocumentCategory;
  description?: string | null;
  uploaded_by_user_id: string;
  view_permissions: UserRole[];
  download_count: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DocumentWithRelations extends Document {
  uploaded_by?: UserProfile;
}

export interface DocumentDownload {
  id: string;
  document_id: string;
  user_id: string;
  downloaded_at?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface DocumentFilters {
  category?: DocumentCategory | 'all';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  uploadedBy?: string;
}

export interface DocumentStats {
  totalDocuments: number;
  totalDownloads: number;
  categoryBreakdown: Record<DocumentCategory, number>;
  recentUploads: DocumentWithRelations[];
  topDownloaded: DocumentWithRelations[];
}

// Document operations
export const getDocuments = async (
  organisationId: string,
  filters: DocumentFilters = {}
): Promise<{ data: DocumentWithRelations[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('documents')
      .select(`
        *,
        uploaded_by:user_profiles(id, full_name, email, role)
      `)
      .eq('organisation_id', organisationId)
      .eq('is_active', true);

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.search) {
      query = query.or(`filename.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters.uploadedBy && filters.uploadedBy !== 'all') {
      query = query.eq('uploaded_by_user_id', filters.uploadedBy);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching documents:', err);
    return { data: null, error: err as Error };
  }
};

export const getDocument = async (
  id: string
): Promise<{ data: DocumentWithRelations | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        uploaded_by:user_profiles(id, full_name, email, role)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error fetching document:', err);
    return { data: null, error: err as Error };
  }
};

export const uploadDocument = async (
  file: File,
  documentData: Omit<Document, 'id' | 'file_path' | 'file_size' | 'file_type' | 'download_count' | 'created_at' | 'updated_at'>
): Promise<{ data: Document | null; error: Error | null }> => {
  try {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { data: null, error: new Error('Filen är för stor. Maximal storlek är 10MB.') };
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return { data: null, error: new Error('Filtyp stöds inte. Tillåtna format: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, TXT') };
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const sanitizedCategory = sanitizeForPath(documentData.category);
    const filePath = `${documentData.organisation_id}/${sanitizedCategory}/${fileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      return { data: null, error: new Error(uploadError.message) };
    }

    // Create document record
    const { data, error } = await supabase
      .from('documents')
      .insert([{
        ...documentData,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type
      }])
      .select()
      .single();

    if (error) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('documents').remove([filePath]);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error uploading document:', err);
    return { data: null, error: err as Error };
  }
};

export const updateDocument = async (
  id: string,
  updates: Partial<Document>
): Promise<{ data: Document | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error updating document:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteDocument = async (id: string): Promise<{ error: Error | null }> => {
  try {
    // Get document to delete file from storage
    const { data: document } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', id)
      .single();

    // Delete from database
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: new Error(error.message) };
    }

    // Delete file from storage
    if (document?.file_path) {
      await supabase.storage
        .from('documents')
        .remove([document.file_path]);
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting document:', err);
    return { error: err as Error };
  }
};

export const downloadDocument = async (
  documentId: string,
  userId: string
): Promise<{ data: { url: string } | null; error: Error | null }> => {
  try {
    // Get document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('file_path, filename')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return { data: null, error: new Error('Dokument hittades inte') };
    }

    // Get signed URL for download
    const { data: urlData, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.file_path, 3600); // 1 hour expiry

    if (urlError) {
      return { data: null, error: new Error(urlError.message) };
    }

    // Track download
    await supabase
      .from('document_downloads')
      .insert({
        document_id: documentId,
        user_id: userId,
        ip_address: 'unknown', // Would be populated by edge function in real implementation
        user_agent: navigator.userAgent
      });

    return { data: { url: urlData.signedUrl }, error: null };
  } catch (err) {
    console.error('Error downloading document:', err);
    return { data: null, error: err as Error };
  }
};

export const getDocumentStats = async (
  organisationId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ data: DocumentStats | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('documents')
      .select(`
        *,
        uploaded_by:user_profiles(id, full_name, email)
      `)
      .eq('organisation_id', organisationId)
      .eq('is_active', true);

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const documents = data || [];
    const totalDocuments = documents.length;
    const totalDownloads = documents.reduce((sum, doc) => sum + doc.download_count, 0);

    const categoryBreakdown = documents.reduce((acc, doc) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1;
      return acc;
    }, {} as Record<DocumentCategory, number>);

    const recentUploads = documents.slice(0, 5);
    const topDownloaded = [...documents]
      .sort((a, b) => b.download_count - a.download_count)
      .slice(0, 5);

    return {
      data: {
        totalDocuments,
        totalDownloads,
        categoryBreakdown,
        recentUploads,
        topDownloaded
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching document stats:', err);
    return { data: null, error: err as Error };
  }
};

// Utility functions
export const getFileIcon = (fileType?: string | null): string => {
  if (!fileType) return '📄';
  
  if (fileType.includes('pdf')) return '📕';
  if (fileType.includes('word') || fileType.includes('document')) return '📘';
  if (fileType.includes('excel') || fileType.includes('sheet')) return '📗';
  if (fileType.includes('image')) return '🖼️';
  if (fileType.includes('text')) return '📄';
  
  return '📄';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const canUserViewDocument = (document: Document, userRole: UserRole): boolean => {
  return document.view_permissions.includes(userRole);
};

export const canUserEditDocument = (document: Document, userId: string, userRole: UserRole): boolean => {
  return document.uploaded_by_user_id === userId || userRole === 'admin';
};

export const canUserDeleteDocument = (userRole: UserRole): boolean => {
  return userRole === 'admin';
};

export const getCategoryColor = (category: DocumentCategory): string => {
  switch (category) {
    case 'Policys': return 'bg-red-100 text-red-800';
    case 'Mallar': return 'bg-blue-100 text-blue-800';
    case 'Utbildning': return 'bg-green-100 text-green-800';
    case 'Rutiner': return 'bg-purple-100 text-purple-800';
    case 'Övrigt': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getCategoryIcon = (category: DocumentCategory): string => {
  switch (category) {
    case 'Policys': return '📋';
    case 'Mallar': return '📝';
    case 'Utbildning': return '🎓';
    case 'Rutiner': return '⚙️';
    case 'Övrigt': return '📁';
    default: return '📄';
  }
};

export const isPreviewableFile = (fileType?: string | null): boolean => {
  if (!fileType) return false;
  
  return fileType.includes('pdf') || 
         fileType.includes('image') || 
         fileType.includes('text');
};

export const getDocumentPreviewUrl = async (filePath: string): Promise<string | null> => {
  try {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    return data?.signedUrl || null;
  } catch (err) {
    console.error('Error getting preview URL:', err);
    return null;
  }
};

const sanitizeForPath = (text: string): string => {
  return text
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ /g, '-')
    .replace(/[^a-zA-Z0-9-]/g, ''); // Remove any remaining special characters
};