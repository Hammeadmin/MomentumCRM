// components/WorkerJobDetailsModal.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { X, Edit, Eye, Trash2, Paperclip, Send, Camera, FileText } from 'lucide-react';
import {
  getOrderNotes,
  createOrderNote,
  getAttachmentsForOrder,
  addAttachmentToOrder,
  updateOrderNote,
  deleteOrderNote,
  deleteOrderAttachment,
  getAttachmentPublicUrl,
  OrderAttachment
} from '../lib/orders'; // <-- Corrected import path
import { OrderNote } from '../types/database';
import { supabase } from '../lib/supabase'; // Import supabase for the user profile query


interface WorkerJobDetailsModalProps {
  order: any; // The full order object from the worker dashboard
  onClose: () => void;
}

export const WorkerJobDetailsModal = ({ order, onClose }: WorkerJobDetailsModalProps) => {
  const { user } = useAuth();
  // FIX 1: Correctly destructure the toast functions
  const { success, error: showError } = useToast();
  const [notes, setNotes] = useState<any[]>([]); // Use any[] to accommodate the added 'user' property
  const [attachments, setAttachments] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // FIX 2: Add the missing 'isLoading' state
  const [isLoading, setIsLoading] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  useEffect(() => {
    fetchData();
  }, [order.id]);

  const fetchData = async () => {
    setIsLoading(true);

    // Step 1: Fetch notes and attachments as before.
    const [notesRes, attachmentsRes] = await Promise.all([
      getOrderNotes(order.id),
      getAttachmentsForOrder(order.id),
    ]);

    const notesData = (notesRes.data as OrderNote[]) || [];
    const attachmentsData = (attachmentsRes.data as OrderAttachment[]) || [];

    setNotes(notesData);

    // Step 2: If there are attachments, get the user profiles for them.
    if (attachmentsData.length > 0) {
      // Get all unique user IDs from the attachments
      const userIds = [...new Set(attachmentsData.map(att => att.uploaded_by_user_id))];

      // Fetch the profiles for those users
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (usersError) {
        console.error("Could not fetch user profiles for attachments:", usersError);
      }

      // Combine the attachment data with the user's full name
      const attachmentsWithUsers = attachmentsData.map(att => {
        const userProfile = usersData?.find(u => u.id === att.uploaded_by_user_id);
        return {
          ...att,
          user: userProfile ? { full_name: userProfile.full_name } : { full_name: 'Okänd' },
        };
      });
      setAttachments(attachmentsWithUsers as any);

    } else {
      setAttachments([]);
    }

    setIsLoading(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;
    setIsSubmitting(true);
    const { error } = await createOrderNote({
      order_id: order.id,
      user_id: user.id,
      content: newNote,
    });
    setIsSubmitting(false);

    if (error) {
      showError('Fel', 'Kunde inte lägga till anteckning.', 'error');
    } else {
      success('Klart!', 'Anteckning tillagd.', 'success');
      setNewNote('');
      fetchData();
    }
  };

  const handleEditNoteClick = (note: any) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
  };

  const handleSaveNoteEdit = async () => {
    if (!editingNoteId || !editingNoteContent.trim()) return;

    await updateOrderNote(editingNoteId, editingNoteContent);

    setEditingNoteId(null);
    setEditingNoteContent('');
    fetchData(); // Refresh the notes list
    success('Anteckning uppdaterad.');
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna anteckning?')) return;
    await deleteOrderNote(noteId);
    fetchData(); // Refresh the notes list
    success('Anteckning borttagen.');
  };

  const handleDeleteAttachment = async (attachment: OrderAttachment) => {
    if (!confirm(`Är du säker på att du vill ta bort filen "${attachment.file_name}"?`)) return;
    await deleteOrderAttachment(attachment);
    fetchData(); // Refresh the attachments list
    success('Fil borttagen.');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setNewFiles(Array.from(event.target.files));
    }
  };

  const handleUploadFiles = async () => {
    if (newFiles.length === 0 || !user) return;
    setIsSubmitting(true);

    for (const file of newFiles) {
      const { error } = await addAttachmentToOrder(order.id, user.id, file);
      if (error) {
        showError('Fel', `Kunde inte ladda upp ${file.name}.`);
      }
    }

    setIsSubmitting(false);
    setNewFiles([]);
    fetchData();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">{order.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Notes Section */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Anteckningar</h3>
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-2">
              {notes.length > 0 ? notes.map(note => (
                <div key={note.id} className="bg-gray-100 p-3 rounded-lg text-sm group">
                  <p className="text-xs font-semibold text-gray-600 mb-1">{note.user?.full_name || 'Okänd'}</p>
                  {editingNoteId === note.id ? (
                    <div>
                      <textarea
                        value={editingNoteContent}
                        onChange={(e) => setEditingNoteContent(e.target.value)}
                        className="w-full p-2 border rounded-md text-sm"
                      />
                      <div className="flex justify-end space-x-2 mt-2">
                        <button onClick={() => setEditingNoteId(null)} className="text-xs text-gray-600">Avbryt</button>
                        <button onClick={handleSaveNoteEdit} className="text-xs text-blue-600 font-semibold">Spara</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <p className="flex-1 whitespace-pre-wrap">{note.content}</p>
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditNoteClick(note)} className="p-1 text-gray-500 hover:text-blue-600">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDeleteNote(note.id)} className="p-1 text-gray-500 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )) : <p className="text-gray-500 text-sm">Inga anteckningar ännu.</p>}
            </div>
            <div className="flex">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Skriv en ny anteckning..."
                className="flex-grow border border-gray-300 rounded-l-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button onClick={handleAddNote} disabled={isSubmitting || !newNote.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center">
                <Send size={20} />
              </button>
            </div>
          </div>

          {/* Attachments Section */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Bifogade Filer</h3>
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-2">
              {attachments.length > 0 ? attachments.map(att => (
                <div key={att.id} className="bg-gray-100 p-3 rounded-lg text-sm group">
                  <p className="text-xs font-semibold text-gray-600 mb-1">{(att as any).user?.full_name || 'Okänd'}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center truncate">
                      {att.file_type?.startsWith('image/') ? <Camera className="mr-2 text-gray-600 flex-shrink-0" /> : <FileText className="mr-2 text-gray-600 flex-shrink-0" />}
                      <span className="truncate">{att.file_name}</span>
                    </div>
                    <div className="flex items-center flex-shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={getAttachmentPublicUrl(att.file_path)} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-500 hover:text-blue-600">
                        <Eye size={16} />
                      </a>
                      <button onClick={() => handleDeleteAttachment(att)} className="p-1 text-gray-500 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )) : <p className="text-gray-500 text-sm">Inga filer uppladdade.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ladda upp nya filer</label>
              <input type="file" multiple onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              {newFiles.length > 0 && (
                <button onClick={handleUploadFiles} disabled={isSubmitting} className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center">
                  <Paperclip size={16} className="mr-2" /> Ladda upp {newFiles.length} fil(er)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};