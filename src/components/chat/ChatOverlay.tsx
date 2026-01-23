/**
 * ChatOverlay Component - PRODUCTION VERSION
 * 
 * Real-time chat panel with database integration.
 * Supports direct messages, team chats, and order-specific chats.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    X,
    Send,
    Search,
    Plus,
    Users,
    MessageCircle,
    Hash,
    ChevronLeft,
    MoreHorizontal,
    Paperclip,
    RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getChatChannels, getChatMessages, sendChatMessage } from '../../lib/activityService';
import { supabase } from '../../lib/supabase';
import { NewChatModal } from './NewChatModal';

interface ChatMessage {
    id: string;
    content: string;
    created_at: string;
    sender: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
}

interface ChatChannel {
    id: string;
    name: string;
    type: 'direct' | 'team' | 'order';
    related_order_id?: string;
    related_team_id?: string;
    created_at: string;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount?: number;
}

interface ChatOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChatOverlay({ isOpen, onClose }: ChatOverlayProps) {
    const { user, organisationId } = useAuth();
    const [channels, setChannels] = useState<ChatChannel[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
    const [message, setMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Cache for user profiles to prevent re-fetching on every message
    const userProfileCacheRef = useRef<Map<string, { id: string; full_name: string; avatar_url?: string }>>(new Map());

    // Fetch channels when panel opens
    useEffect(() => {
        if (isOpen && organisationId && user?.id) {
            fetchChannels();
        }
    }, [isOpen, organisationId, user?.id]);

    // Fetch messages when channel changes
    useEffect(() => {
        if (selectedChannel) {
            fetchMessages(selectedChannel.id);
            const cleanup = subscribeToMessages(selectedChannel.id);
            return cleanup; // Properly cleanup subscription on unmount or channel change
        }
    }, [selectedChannel?.id]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchChannels = async () => {
        if (!organisationId || !user?.id) return;
        setLoading(true);
        try {
            const { data, error } = await getChatChannels(organisationId, user.id);
            if (error) throw error;
            setChannels(data || []);
        } catch (err) {
            console.error('Error fetching channels:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (channelId: string) => {
        setLoading(true);
        try {
            const { data, error } = await getChatMessages(channelId, 50);
            if (error) throw error;
            setMessages(data || []);
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToMessages = (channelId: string) => {
        const subscription = supabase
            .channel(`chat-${channelId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `channel_id=eq.${channelId}`
                },
                async (payload) => {
                    const newMsg = payload.new as any;
                    let senderProfile = null;

                    if (newMsg.sender_user_id) {
                        // Check cache first to avoid N+1 fetches
                        const cached = userProfileCacheRef.current.get(newMsg.sender_user_id);

                        if (cached) {
                            // Use cached profile
                            senderProfile = cached;
                        } else {
                            // Only fetch if not in cache
                            const { data: fetchedProfile } = await supabase
                                .from('user_profiles')
                                .select('id, full_name, avatar_url')
                                .eq('id', newMsg.sender_user_id)
                                .single();

                            if (fetchedProfile) {
                                // Add to cache for future messages
                                userProfileCacheRef.current.set(newMsg.sender_user_id, fetchedProfile);
                                senderProfile = fetchedProfile;
                            }
                        }
                    }

                    const enrichedMessage: ChatMessage = {
                        id: newMsg.id,
                        content: newMsg.content,
                        created_at: newMsg.created_at,
                        sender: senderProfile || { id: newMsg.sender_user_id, full_name: 'Unknown' }
                    };

                    setMessages(prev => [...prev, enrichedMessage]);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    };

    const handleSendMessage = async () => {
        if (!message.trim() || !selectedChannel || !user?.id) return;

        const messageContent = message.trim();
        setSendingMessage(true);

        // Optimistic update - immediately add message to UI
        const optimisticMessage: ChatMessage = {
            id: `temp-${Date.now()}`,
            content: messageContent,
            created_at: new Date().toISOString(),
            sender: {
                id: user.id,
                full_name: user.user_metadata?.full_name || 'Du',
                avatar_url: user.user_metadata?.avatar_url
            }
        };
        setMessages(prev => [...prev, optimisticMessage]);
        setMessage('');

        try {
            const { error } = await sendChatMessage(selectedChannel.id, user.id, messageContent);
            if (error) throw error;
            // Message sent successfully - the realtime subscription will update with the real message
            // or we keep the optimistic one if realtime isn't working
        } catch (err) {
            console.error('Error sending message:', err);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
            setMessage(messageContent); // Restore the message
        } finally {
            setSendingMessage(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    };

    const getChannelIcon = (type: ChatChannel['type']) => {
        switch (type) {
            case 'team': return <Users className="w-4 h-4" />;
            case 'order': return <Hash className="w-4 h-4" />;
            default: return <MessageCircle className="w-4 h-4" />;
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-40 lg:bg-transparent"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-zinc-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-200 dark:border-zinc-800">
                    {selectedChannel ? (
                        <>
                            <button
                                onClick={() => setSelectedChannel(null)}
                                className="p-1.5 -ml-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                <ChevronLeft className="w-5 h-5 text-zinc-500" />
                            </button>
                            <div className="flex-1 ml-2">
                                <h2 className="font-semibold text-zinc-900 dark:text-white text-sm">{selectedChannel.name}</h2>
                                <p className="text-xs text-zinc-500">
                                    {selectedChannel.type === 'team' ? 'Gruppchatt' :
                                        selectedChannel.type === 'order' ? 'Orderchatt' : 'Direktmeddelande'}
                                </p>
                            </div>
                            <button className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                <MoreHorizontal className="w-5 h-5 text-zinc-500" />
                            </button>
                        </>
                    ) : (
                        <>
                            <h2 className="font-semibold text-zinc-900 dark:text-white">Chatt</h2>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={fetchChannels}
                                    className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    <RefreshCw className={`w-5 h-5 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                    onClick={() => setShowNewChatModal(true)}
                                    className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    title="Ny chatt"
                                >
                                    <Plus className="w-5 h-5 text-zinc-500" />
                                </button>
                                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                    <X className="w-5 h-5 text-zinc-500" />
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {selectedChannel ? (
                    /* Chat View */
                    <>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500 text-sm">
                                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>Inga meddelanden ännu</p>
                                    <p className="text-xs mt-1">Starta en konversation!</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isOwn = msg.sender?.id === user?.id;
                                    return (
                                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] ${isOwn ? 'order-2' : ''}`}>
                                                {!isOwn && (
                                                    <p className="text-xs text-zinc-500 mb-1 ml-1">{msg.sender?.full_name}</p>
                                                )}
                                                <div className={`px-3 py-2 rounded-2xl ${isOwn
                                                    ? 'bg-cyan-500 text-white rounded-br-md'
                                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-bl-md'
                                                    }`}>
                                                    <p className="text-sm">{msg.content}</p>
                                                </div>
                                                <p className={`text-[10px] text-zinc-400 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                                                    {formatTime(msg.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-end gap-2">
                                <button className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                <div className="flex-1 relative">
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Skriv ett meddelande..."
                                        rows={1}
                                        className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-500 resize-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                </div>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!message.trim() || sendingMessage}
                                    className="p-2.5 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className={`w-4 h-4 ${sendingMessage ? 'animate-pulse' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Channel List View */
                    <>
                        {/* Search */}
                        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Sök konversationer..."
                                    className="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-sm text-zinc-900 dark:text-white placeholder-zinc-500 focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                        </div>

                        {/* Channel List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
                                </div>
                            ) : channels.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500 text-sm">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>Inga chattar ännu</p>
                                    <button
                                        onClick={() => setShowNewChatModal(true)}
                                        className="mt-2 text-cyan-500 hover:text-cyan-600 text-sm font-medium"
                                    >
                                        + Starta en ny chatt
                                    </button>
                                </div>
                            ) : (
                                channels.filter(ch =>
                                    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
                                ).map((channel) => (
                                    <button
                                        key={channel.id}
                                        onClick={() => setSelectedChannel(channel)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                                    >
                                        {/* Avatar */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${channel.type === 'team' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                                            channel.type === 'order' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                                                'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600'
                                            }`}>
                                            {getChannelIcon(channel.type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium text-sm text-zinc-900 dark:text-white truncate">{channel.name}</p>
                                                {channel.lastMessageTime && (
                                                    <span className="text-xs text-zinc-400 flex-shrink-0 ml-2">
                                                        {formatTime(channel.lastMessageTime.toISOString())}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between mt-0.5">
                                                <p className="text-xs text-zinc-500 truncate">{channel.lastMessage || 'Ny chatt'}</p>
                                                {channel.unreadCount && channel.unreadCount > 0 && (
                                                    <span className="ml-2 flex-shrink-0 w-5 h-5 bg-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                                        {channel.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* New Chat Modal */}
            <NewChatModal
                isOpen={showNewChatModal}
                onClose={() => setShowNewChatModal(false)}
                onChatCreated={(channelId) => {
                    // Refresh channels and select the new one
                    fetchChannels().then(() => {
                        // Find and select the newly created channel
                        const newChannel = channels.find(c => c.id === channelId);
                        if (newChannel) {
                            setSelectedChannel(newChannel);
                        }
                    });
                }}
            />
        </>
    );
}

export default ChatOverlay;
