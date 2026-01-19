/**
 * NewChatModal - Modal for creating new direct or team chats
 */

import { useState, useEffect } from 'react';
import { X, Users, MessageCircle, Search, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getTeamMembers } from '../../lib/database';
import { createChatChannel } from '../../lib/activityService';

interface TeamMember {
    id: string;
    full_name: string;
    email?: string | null;
    role?: string;
}

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onChatCreated: (channelId: string) => void;
}

export function NewChatModal({ isOpen, onClose, onChatCreated }: NewChatModalProps) {
    const { user, organisationId } = useAuth();
    const [chatType, setChatType] = useState<'direct' | 'team'>('direct');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [groupName, setGroupName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && organisationId) {
            fetchTeamMembers();
        }
    }, [isOpen, organisationId]);

    const fetchTeamMembers = async () => {
        if (!organisationId) return;
        setLoading(true);
        try {
            const { data, error } = await getTeamMembers(organisationId);
            if (error) throw error;
            // Filter out current user from the list
            const filteredMembers = (data || []).filter(member => member.id !== user?.id);
            setTeamMembers(filteredMembers);
        } catch (err) {
            console.error('Error fetching team members:', err);
            setError('Kunde inte hämta teammedlemmar');
        } finally {
            setLoading(false);
        }
    };

    const handleMemberToggle = (memberId: string) => {
        if (chatType === 'direct') {
            // For direct chat, only allow one selection
            setSelectedMembers(prev =>
                prev.includes(memberId) ? [] : [memberId]
            );
        } else {
            // For team chat, allow multiple selections
            setSelectedMembers(prev =>
                prev.includes(memberId)
                    ? prev.filter(id => id !== memberId)
                    : [...prev, memberId]
            );
        }
    };

    const handleCreateChat = async () => {
        if (!organisationId || !user?.id || selectedMembers.length === 0) return;

        setCreating(true);
        setError(null);

        try {
            const { data, error } = await createChatChannel(
                organisationId,
                user.id,
                selectedMembers,
                chatType,
                chatType === 'team' ? groupName || undefined : undefined
            );

            if (error) throw error;
            if (data) {
                onChatCreated(data.id);
                handleClose();
            }
        } catch (err) {
            console.error('Error creating chat:', err);
            setError('Kunde inte skapa chatt. Försök igen.');
        } finally {
            setCreating(false);
        }
    };

    const handleClose = () => {
        setSelectedMembers([]);
        setGroupName('');
        setSearchQuery('');
        setChatType('direct');
        setError(null);
        onClose();
    };

    const filteredMembers = teamMembers.filter(member =>
        member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-[60]"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-white dark:bg-zinc-900 rounded-xl shadow-2xl z-[61] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="font-semibold text-zinc-900 dark:text-white">Ny chatt</h2>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                {/* Chat Type Selection */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setChatType('direct');
                                setSelectedMembers([]);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${chatType === 'direct'
                                ? 'bg-cyan-500 text-white'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                }`}
                        >
                            <MessageCircle className="w-4 h-4" />
                            Direktmeddelande
                        </button>
                        <button
                            onClick={() => {
                                setChatType('team');
                                setSelectedMembers([]);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${chatType === 'team'
                                ? 'bg-cyan-500 text-white'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            Gruppchatt
                        </button>
                    </div>
                </div>

                {/* Group Name (only for team chats) */}
                {chatType === 'team' && (
                    <div className="px-4 pt-4">
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Gruppnamn (valfritt)"
                            className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-sm text-zinc-900 dark:text-white placeholder-zinc-500 focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                )}

                {/* Search */}
                <div className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Sök teammedlemmar..."
                            className="w-full pl-9 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-sm text-zinc-900 dark:text-white placeholder-zinc-500 focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                </div>

                {/* Member List */}
                <div className="max-h-64 overflow-y-auto px-4">
                    {loading ? (
                        <div className="text-center py-8 text-zinc-500">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500 mx-auto"></div>
                            <p className="mt-2 text-sm">Laddar...</p>
                        </div>
                    ) : filteredMembers.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 text-sm">
                            Inga teammedlemmar hittades
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredMembers.map((member) => (
                                <button
                                    key={member.id}
                                    onClick={() => handleMemberToggle(member.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${selectedMembers.includes(member.id)
                                        ? 'bg-cyan-50 dark:bg-cyan-900/20'
                                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                        }`}
                                >
                                    <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-sm font-medium">
                                            {member.full_name?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                            {member.full_name}
                                        </p>
                                        {member.email && (
                                            <p className="text-xs text-zinc-500">{member.email}</p>
                                        )}
                                    </div>
                                    {selectedMembers.includes(member.id) && (
                                        <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="px-4 py-2">
                        <p className="text-sm text-red-500">{error}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                        onClick={handleCreateChat}
                        disabled={selectedMembers.length === 0 || creating}
                        className="w-full py-2.5 bg-cyan-500 text-white rounded-lg font-medium text-sm hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {creating ? 'Skapar...' : 'Starta chatt'}
                    </button>
                </div>
            </div>
        </>
    );
}

export default NewChatModal;
