// src/components/TaskDetailModal.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { updateSalesTask, getTaskNotes, createTaskNote } from '../lib/leads';
import type { SalesTask, UserProfile, TaskNote, TaskStatus } from '../types/database';
import { X, CheckSquare, ThumbsDown, Calendar, AlignLeft, Send, Briefcase } from 'lucide-react';
import { formatDate } from '../lib/database';

const TaskDetailModal = ({ task, members, onClose, onUpdate }: { task: SalesTask | null, members: UserProfile[], onClose: () => void, onUpdate: () => void }) => {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    const [notes, setNotes] = useState<TaskNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [denialReason, setDenialReason] = useState('');
    const [showDenyInput, setShowDenyInput] = useState(false);

    useEffect(() => {
        if (task) {
            setNotes(task.notes || []);
            // Reset deny input when a new task is opened
            setShowDenyInput(false);
            setDenialReason('');
        }
    }, [task]);

    const loadNotes = async () => {
        if (!task) return;
        const { data } = await getTaskNotes(task.id);
        setNotes(data || []);
    };

    const handleAddNote = async () => {
        if (!task || !newNote.trim() || !user) return;
        const result = await createTaskNote(task.id, user.id, newNote.trim());
        if (result.error) {
            showError('Fel', 'Kunde inte lägga till anteckning.');
        } else {
            setNewNote('');
            loadNotes(); // Refresh notes list
        }
    };

    const handleStatusUpdate = async (status: TaskStatus, note?: string) => {
        if (!task) return;
        const result = await updateSalesTask(task.id, { status, notes: note });
        if (result.error) {
            showError('Fel', 'Kunde inte uppdatera uppgift.');
        } else {
            success('Framgång', 'Uppgift uppdaterad!');
            onUpdate(); // Tell the dashboard to refresh its data
            onClose();
        }
    };

    if (!task) return null;

    const assignedUser = members.find(m => m.id === task.user_id);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-bold">{task.title}</h3>
                            <p className="text-sm text-gray-500">Tilldelad till: {assignedUser?.full_name || 'Okänd'}</p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
                    </div>
                    
                    {task.description && <p className="text-gray-700 mb-4 flex items-start"><AlignLeft className="w-4 h-4 inline mr-2 mt-1 flex-shrink-0"/><span>{task.description}</span></p>}
                    {task.due_date && <p className="text-gray-700 mb-4 flex items-center"><Calendar className="w-4 h-4 inline mr-2"/>Förfaller: {formatDate(task.due_date)}</p>}
                    {task.order && (
                        <p className="text-gray-700 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
                            <Briefcase className="w-4 h-4 inline mr-2 text-blue-600"/>
                            Kopplad till order: <a href={`/orders`} className="font-semibold text-blue-600 hover:underline ml-1">{task.order.title}</a>
                        </p>
                    )}

                    <div className="mb-4">
                        <h4 className="font-semibold mb-2">Anteckningar</h4>
                        <div className="space-y-3 max-h-40 overflow-y-auto bg-gray-50 p-3 rounded-lg border">
                            {notes.length > 0 ? notes.map(note => (
                                <div key={note.id}>
                                    <p className="text-sm"><strong>{note.user?.full_name || 'Okänd'}:</strong> {note.content}</p>
                                    <p className="text-xs text-gray-400">{formatDate(note.created_at)}</p>
                                </div>
                            )) : <p className="text-sm text-gray-400 italic">Inga anteckningar ännu.</p>}
                        </div>
                        <div className="mt-2 flex items-center">
                            <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Skriv en anteckning..." className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"/>
                            <button onClick={handleAddNote} className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"><Send className="w-4 h-4"/></button>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-b-xl">
                    {task.status === 'pending' && user?.id === task.user_id && !showDenyInput && (
                        <div className="flex items-center space-x-2">
                            <button onClick={() => handleStatusUpdate('completed')} className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center hover:bg-green-700"><CheckSquare className="w-4 h-4 mr-2"/>Slutför</button>
                            <button onClick={() => setShowDenyInput(true)} className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center hover:bg-red-700"><ThumbsDown className="w-4 h-4 mr-2"/>Neka</button>
                        </div>
                    )}
                    {showDenyInput && (
                        <div className="w-full mt-2 space-y-2">
                            <input type="text" value={denialReason} onChange={e => setDenialReason(e.target.value)} placeholder="Anledning till nekande..." className="w-full px-3 py-2 border rounded-md"/>
                            <div className="flex justify-end space-x-2">
                                <button onClick={() => setShowDenyInput(false)} className="px-4 py-2 border rounded-md">Avbryt</button>
                                <button onClick={() => handleStatusUpdate('denied', denialReason)} className="px-4 py-2 bg-red-600 text-white rounded-md">Bekräfta nekande</button>
                            </div>
                        </div>
                    )}
                     {task.status !== 'pending' && (
                        <p className="text-sm font-semibold text-gray-600">Status: {task.status === 'completed' ? 'Slutförd' : 'Nekad'}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;