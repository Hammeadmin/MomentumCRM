/**
 * Activity Service - Real-time activity feed data
 * 
 * Aggregates activities from multiple tables:
 * - order_activities
 * - lead_activities  
 * - job_activities
 * - invoice_emails (for quote/invoice opened tracking)
 * - communications (for email/SMS tracking)
 */

import { supabase } from './supabase';

export interface ActivityItem {
    id: string;
    type: 'quote_sent' | 'quote_opened' | 'quote_accepted' | 'quote_rejected' |
    'order_created' | 'order_updated' | 'order_completed' |
    'invoice_sent' | 'invoice_paid' | 'invoice_opened' |
    'customer_added' | 'lead_created' | 'lead_updated';
    title: string;
    description?: string;
    entityId?: string;
    entityType?: 'quote' | 'order' | 'invoice' | 'customer' | 'lead';
    viewCount?: number;
    timestamp: Date;
    actorName?: string;
    isHot?: boolean;
    metadata?: Record<string, any>;
}

/**
 * Fetch recent activities for the dashboard
 */
export async function getRecentActivities(
    organisationId: string,
    limit: number = 20
): Promise<{ data: ActivityItem[] | null; error: Error | null }> {
    try {
        // Fetch activities from multiple sources in parallel
        const [orderActivities, leadActivities, invoiceEmails] = await Promise.all([
            // Order activities
            supabase
                .from('order_activities')
                .select(`
          id,
          activity_type,
          description,
          created_at,
          order_id,
          user:user_profiles!order_activities_user_id_fkey(full_name),
          order:orders!order_activities_order_id_fkey(title, customer:customers(name))
        `)
                .eq('orders.organisation_id', organisationId)
                .order('created_at', { ascending: false })
                .limit(limit),

            // Lead activities
            supabase
                .from('lead_activities')
                .select(`
          id,
          activity_type,
          description,
          created_at,
          lead_id,
          user:user_profiles!lead_activities_user_id_fkey(full_name),
          lead:leads!lead_activities_lead_id_fkey(title, customer:customers(name))
        `)
                .eq('leads.organisation_id', organisationId)
                .order('created_at', { ascending: false })
                .limit(limit),

            // Invoice emails (for opened tracking)
            supabase
                .from('invoice_emails')
                .select(`
          id,
          status,
          sent_at,
          opened_at,
          invoice:invoices!invoice_emails_invoice_id_fkey(
            invoice_number,
            amount,
            customer:customers(name)
          )
        `)
                .eq('organisation_id', organisationId)
                .order('sent_at', { ascending: false })
                .limit(limit)
        ]);

        // Transform and combine activities
        const activities: ActivityItem[] = [];

        // Transform order activities
        if (orderActivities.data) {
            for (const activity of orderActivities.data) {
                activities.push({
                    id: activity.id,
                    type: mapOrderActivityType(activity.activity_type),
                    title: activity.description || 'Order activity',
                    description: (activity.order as any)?.customer?.name,
                    entityId: activity.order_id,
                    entityType: 'order',
                    timestamp: new Date(activity.created_at),
                    actorName: (activity.user as any)?.full_name
                });
            }
        }

        // Transform lead activities
        if (leadActivities.data) {
            for (const activity of leadActivities.data) {
                activities.push({
                    id: activity.id,
                    type: mapLeadActivityType(activity.activity_type),
                    title: activity.description || 'Lead activity',
                    description: (activity.lead as any)?.customer?.name,
                    entityId: activity.lead_id,
                    entityType: 'lead',
                    timestamp: new Date(activity.created_at),
                    actorName: (activity.user as any)?.full_name
                });
            }
        }

        // Transform invoice emails (for quote opened tracking)
        if (invoiceEmails.data) {
            for (const email of invoiceEmails.data) {
                if (email.opened_at) {
                    activities.push({
                        id: email.id,
                        type: 'invoice_opened',
                        title: `Faktura ${(email.invoice as any)?.invoice_number} öppnad`,
                        description: `${(email.invoice as any)?.customer?.name} - ${formatCurrency((email.invoice as any)?.amount)}`,
                        entityId: (email.invoice as any)?.id,
                        entityType: 'invoice',
                        timestamp: new Date(email.opened_at),
                        isHot: false // Could check view count here
                    });
                }
                if (email.sent_at) {
                    activities.push({
                        id: `${email.id}-sent`,
                        type: 'invoice_sent',
                        title: `Faktura ${(email.invoice as any)?.invoice_number} skickad`,
                        description: `${(email.invoice as any)?.customer?.name} - ${formatCurrency((email.invoice as any)?.amount)}`,
                        entityId: (email.invoice as any)?.id,
                        entityType: 'invoice',
                        timestamp: new Date(email.sent_at)
                    });
                }
            }
        }

        // Sort by timestamp descending
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return { data: activities.slice(0, limit), error: null };
    } catch (error) {
        console.error('Error fetching activities:', error);
        return { data: null, error: error as Error };
    }
}

/**
 * Get quote view tracking data - for "hot leads" detection
 */
export async function getQuoteViewCounts(
    organisationId: string
): Promise<{ data: Record<string, number> | null; error: Error | null }> {
    try {
        // This would query a quote_views or similar table
        // For now, we'll use invoice_emails as a proxy
        const { data, error } = await supabase
            .from('invoice_emails')
            .select('invoice_id, opened_at')
            .eq('organisation_id', organisationId)
            .not('opened_at', 'is', null);

        if (error) throw error;

        // Count opens per invoice
        const counts: Record<string, number> = {};
        for (const row of data || []) {
            counts[row.invoice_id] = (counts[row.invoice_id] || 0) + 1;
        }

        return { data: counts, error: null };
    } catch (error) {
        return { data: null, error: error as Error };
    }
}

/**
 * Get chat channels for the current user
 */
export async function getChatChannels(
    organisationId: string,
    _userId: string
): Promise<{ data: any[] | null; error: Error | null }> {
    try {
        // Note: chat_channel_members table doesn't exist - fetching all org channels
        const { data, error } = await supabase
            .from('chat_channels')
            .select(`
                id,
                name,
                type,
                created_at
            `)
            .eq('organisation_id', organisationId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        return { data: null, error: error as Error };
    }
}

/**
 * Get messages for a chat channel
 */
export async function getChatMessages(
    channelId: string,
    limit: number = 50
): Promise<{ data: any[] | null; error: Error | null }> {
    try {
        // Fetch LAST N messages by ordering descending, then reverse for display
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select(`
                id,
                content,
                created_at,
                sender_user_id
            `)
            .eq('channel_id', channelId)  // Uses idx_chat_messages_channel_date index
            .order('created_at', { ascending: false })  // Get newest first
            .limit(limit);  // Limit to last N messages

        if (error) throw error;

        if (!messages || messages.length === 0) {
            return { data: [], error: null };
        }

        // Get unique sender IDs
        const senderIds = [...new Set(messages.map(m => m.sender_user_id).filter(Boolean))];

        // Fetch user profiles for senders
        const { data: users } = await supabase
            .from('user_profiles')
            .select('id, full_name, avatar_url')
            .in('id', senderIds);

        // Map users by ID for quick lookup
        const userMap = new Map((users || []).map(u => [u.id, u]));

        // Enrich messages with sender info
        const enrichedMessages = messages.map(msg => ({
            ...msg,
            sender: userMap.get(msg.sender_user_id) || null
        }));

        // Reverse to chronological order (oldest first) for display
        return { data: enrichedMessages.reverse(), error: null };
    } catch (error) {
        return { data: null, error: error as Error };
    }
}

/**
 * Send a chat message
 */
export async function sendChatMessage(
    channelId: string,
    senderId: string,
    content: string
): Promise<{ data: any | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('chat_messages')
            .insert({
                channel_id: channelId,
                sender_user_id: senderId,
                content
            })
            .select()
            .single();

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        return { data: null, error: error as Error };
    }
}

/**
 * Create a new chat channel (direct or team)
 */
export async function createChatChannel(
    organisationId: string,
    creatorUserId: string,
    memberUserIds: string[],
    type: 'direct' | 'team' = 'direct',
    name?: string
): Promise<{ data: any | null; error: Error | null }> {
    try {
        // Generate default name for direct chats
        let channelName = name;
        if (!channelName && type === 'direct' && memberUserIds.length === 1) {
            // For direct chats, we'll update the name after fetching user info
            channelName = 'Ny chatt';
        } else if (!channelName) {
            channelName = 'Gruppchatt';
        }

        // Create the channel
        // Note: chat_channels only has: id, organisation_id, name, type, created_at
        const { data: channel, error: channelError } = await supabase
            .from('chat_channels')
            .insert({
                organisation_id: organisationId,
                name: channelName,
                type
            })
            .select()
            .single();

        if (channelError) throw channelError;

        // Note: chat_channel_members table doesn't exist - channel membership
        // is not tracked. All org users can see all channels.

        return { data: channel, error: null };
    } catch (error) {
        console.error('Error creating chat channel:', error);
        return { data: null, error: error as Error };
    }
}

/**
 * Get quick texts for the organisation
 */
export async function getQuickTexts(
    organisationId: string
): Promise<{ data: any[] | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('quick_texts')
            .select('*')
            .eq('organisation_id', organisationId)
            .order('title', { ascending: true });

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        return { data: null, error: error as Error };
    }
}

/**
 * Create a quick text
 */
export async function createQuickText(
    organisationId: string,
    userId: string,
    data: { title: string; content: string; shortcut?: string; category?: string }
): Promise<{ data: any | null; error: Error | null }> {
    try {
        const { data: result, error } = await supabase
            .from('quick_texts')
            .insert({
                organisation_id: organisationId,
                created_by_user_id: userId,
                ...data
            })
            .select()
            .single();

        if (error) throw error;

        return { data: result, error: null };
    } catch (error) {
        return { data: null, error: error as Error };
    }
}

// Helper functions
function mapOrderActivityType(type: string): ActivityItem['type'] {
    switch (type.toLowerCase()) {
        case 'created': return 'order_created';
        case 'updated': return 'order_updated';
        case 'completed': return 'order_completed';
        case 'status_change': return 'order_updated';
        default: return 'order_updated';
    }
}

function mapLeadActivityType(type: string): ActivityItem['type'] {
    switch (type.toLowerCase()) {
        case 'created': return 'lead_created';
        case 'updated': return 'lead_updated';
        default: return 'lead_updated';
    }
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('sv-SE', {
        style: 'currency',
        currency: 'SEK',
        minimumFractionDigits: 0
    }).format(amount || 0);
}
