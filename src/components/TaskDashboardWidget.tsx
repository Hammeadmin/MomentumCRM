// src/components/TaskDashboardWidget.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { getSalesTasks, createSalesTask, updateSalesTask, getTaskNotes, createTaskNote } from '../lib/leads';
import { getTeamMembers } from '../lib/database';
import type { SalesTask, UserProfile, TaskNote, TaskStatus } from '../types/database';
import { Plus, CheckSquare, Square, X, Briefcase, MessageSquare, ThumbsDown, Calendar, AlignLeft, Send, Loader2 } from 'lucide-react';
import { formatDate } from '../lib/database';
import { getOrders, OrderWithRelations } from '../lib/orders';
import type { UserRole } from '../types/database';
import { supabase } from '../lib/supabase';

const TaskDashboardWidget = ({ onTaskClick }: { onTaskClick: (task: SalesTask) => void }) => {
    const { user, organisationId } = useAuth();
    const { success, error: showError } = useToast();
    const [tasks, setTasks] = useState<SalesTask[]>([]);
    const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '', assigned_to_user_id: '', order_id: '' });
    const [orders, setOrders] = useState<OrderWithRelations[]>([]);
    const [selectedTask, setSelectedTask] = useState<SalesTask | null>(null); // Add this line
    const [userRole, setUserRole] = useState<UserRole | null>(null);

    useEffect(() => {
        const fetchUserRole = async () => {
            if (user) {
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error("Could not fetch user role:", error);
                } else if (data) {
                    setUserRole(data.role as UserRole);
                }
            }
        };

        fetchUserRole();
    }, [user]);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        const [tasksRes, membersRes, ordersRes] = await Promise.all([
            getSalesTasks(user!.id, true),
            getTeamMembers(organisationId!),
            getOrders(organisationId!) // Fetch orders for the dropdown
        ]);

        if (tasksRes.error) showError('Fel', 'Kunde inte ladda uppgifter.');
        else setTasks(tasksRes.data || []);

        if (membersRes.error) showError('Fel', 'Kunde inte ladda teammedlemmar.');
        else setTeamMembers(membersRes.data || []);

        if (ordersRes.error) showError('Fel', 'Kunde inte ladda ordrar.');
        else setOrders(ordersRes.data || []);

        setLoading(false);
    };

    const handleTaskToggle = async (task: SalesTask) => {
        const { error } = await updateSalesTask(task.id, { is_completed: !task.is_completed });
        if (error) {
            showError('Fel', 'Kunde inte uppdatera uppgiften.');
        } else {
            success('Framgång', `Uppgift ${!task.is_completed ? 'slutförd' : 'återaktiverad'}.`);
            loadData();
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.title || !newTask.assigned_to_user_id) {
            showError('Fel', 'Titel och tilldelad person är obligatoriska.');
            return;
        }
        const result = await createSalesTask({
            organisation_id: organisationId!,
            user_id: newTask.assigned_to_user_id,
            title: newTask.title,
            description: newTask.description || null,
            due_date: newTask.due_date || null,
            created_by: user!.id,
            order_id: newTask.order_id || null,
        });
        if (result.error) {
            showError('Fel', 'Kunde inte skapa uppgift.');
        } else {
            success('Framgång', 'Ny uppgift har skapats!');
            setShowCreateModal(false);
            setNewTask({ title: '', description: '', due_date: '', assigned_to_user_id: '', order_id: '' });
            loadData();
        }
    };

    const getStatusIndicator = (status: TaskStatus) => {
        if (status === 'completed') return <CheckSquare className="w-5 h-5 text-green-500" />;
        if (status === 'denied') return <ThumbsDown className="w-5 h-5 text-red-500" />;
        return <Square className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />;
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Uppgifter</h3>
                {userRole === 'admin' && (
                    <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Ny Uppgift
                    </button>
                )}
            </div>
            {loading ? (
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="space-y-3 overflow-y-auto">
                    {tasks.map(task => (
                        <div key={task.id} onClick={() => onTaskClick(task)} className={`flex items-center justify-between p-3 rounded-lg group cursor-pointer ${task.status === 'completed' ? 'bg-gray-100' : 'bg-white'}`}>
                            <div className="flex items-center">
                                <div className="mr-3">{getStatusIndicator(task.status)}</div>
                                <div>
                                    <p className={`text-sm ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{task.title}</p>
                                    <p className="text-xs text-gray-400">
                                        Till: {teamMembers.find(tm => tm.id === task.user_id)?.full_name || 'Okänd'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Task Modal */}
            {/* Create Task Modal (Updated with labels and order dropdown) */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-semibold">Skapa ny uppgift</h4>
                            <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                                <input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="T.ex. Kontakta kund angående..." required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
                                <textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} placeholder="Lägg till mer detaljer..." className="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Förfallodatum</label>
                                <input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tilldela till</label>
                                <select value={newTask.assigned_to_user_id} onChange={(e) => setNewTask({ ...newTask, assigned_to_user_id: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Välj en person...</option>
                                    {teamMembers.map(member => <option key={member.id} value={member.id}>{member.full_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Koppla till order (valfritt)</label>
                                <select value={newTask.order_id} onChange={(e) => setNewTask({ ...newTask, order_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Ingen order</option>
                                    {orders.map(order => <option key={order.id} value={order.id}>{order.title}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-md">Avbryt</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Skapa</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


        </div>
    );
};

export default TaskDashboardWidget;