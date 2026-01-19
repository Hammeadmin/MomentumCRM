/**
 * Webhooks Library
 * 
 * Provides functions for managing and dispatching webhooks.
 * Webhooks allow users to send data to external services (Zapier, Make, Slack)
 * when events occur in the CRM.
 */

import { supabase } from './supabase';

// ============================================================================
// Types
// ============================================================================

export interface Webhook {
    id: string;
    organisation_id: string;
    name: string;
    event_type: string;
    target_url: string;
    secret?: string | null;
    is_active: boolean;
    headers?: Record<string, string>;
    created_at?: string;
    updated_at?: string;
    created_by_user_id?: string;
}

export interface WebhookLog {
    id: string;
    webhook_id: string;
    organisation_id: string;
    event_type: string;
    payload: any;
    response_status?: number;
    response_body?: string;
    success: boolean;
    error_message?: string;
    duration_ms?: number;
    created_at?: string;
}

export interface WebhookCreateInput {
    name: string;
    event_type: string;
    target_url: string;
    secret?: string;
    is_active?: boolean;
    headers?: Record<string, string>;
}

// Event types that can trigger webhooks
export const WEBHOOK_EVENTS = [
    { value: 'lead.created', label: 'Lead skapad', description: 'När en ny lead skapas' },
    { value: 'lead.status_changed', label: 'Lead status ändrad', description: 'När en lead ändrar status' },
    { value: 'quote.created', label: 'Offert skapad', description: 'När en ny offert skapas' },
    { value: 'quote.accepted', label: 'Offert accepterad', description: 'När en offert accepteras' },
    { value: 'order.created', label: 'Order skapad', description: 'När en ny order skapas' },
    { value: 'order.status_changed', label: 'Order status ändrad', description: 'När en order ändrar status' },
    { value: 'invoice.created', label: 'Faktura skapad', description: 'När en ny faktura skapas' },
    { value: 'invoice.sent', label: 'Faktura skickad', description: 'När en faktura skickas' },
    { value: 'invoice.paid', label: 'Faktura betald', description: 'När en faktura markeras som betald' },
    { value: 'customer.created', label: 'Kund skapad', description: 'När en ny kund skapas' },
    { value: 'event.created', label: 'Möte skapat', description: 'När ett nytt möte skapas' },
] as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[number]['value'];

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get all webhooks for an organisation
 */
export async function getWebhooks(organisationId: string): Promise<{
    data: Webhook[] | null;
    error: Error | null;
}> {
    const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('organisation_id', organisationId)
        .order('created_at', { ascending: false });

    return { data, error: error ? new Error(error.message) : null };
}

/**
 * Create a new webhook
 */
export async function createWebhook(
    organisationId: string,
    webhook: WebhookCreateInput,
    userId?: string
): Promise<{ data: Webhook | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('webhooks')
        .insert({
            organisation_id: organisationId,
            name: webhook.name,
            event_type: webhook.event_type,
            target_url: webhook.target_url,
            secret: webhook.secret || null,
            is_active: webhook.is_active ?? true,
            headers: webhook.headers || {},
            created_by_user_id: userId,
        })
        .select()
        .single();

    return { data, error: error ? new Error(error.message) : null };
}

/**
 * Update a webhook
 */
export async function updateWebhook(
    id: string,
    updates: Partial<WebhookCreateInput>
): Promise<{ data: Webhook | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('webhooks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    return { data, error: error ? new Error(error.message) : null };
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(id: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('webhooks').delete().eq('id', id);
    return { error: error ? new Error(error.message) : null };
}

/**
 * Toggle webhook active status
 */
export async function toggleWebhook(
    id: string,
    isActive: boolean
): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('webhooks')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);

    return { error: error ? new Error(error.message) : null };
}

/**
 * Get webhook logs
 */
export async function getWebhookLogs(
    webhookId: string,
    limit = 20
): Promise<{ data: WebhookLog[] | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('webhook_id', webhookId)
        .order('created_at', { ascending: false })
        .limit(limit);

    return { data, error: error ? new Error(error.message) : null };
}

// ============================================================================
// Webhook Dispatch
// ============================================================================

/**
 * Dispatch a webhook event
 * 
 * Call this function from your application code when events occur.
 * It will find all active webhooks for the event type and dispatch them.
 * 
 * @example
 * // When a lead is created:
 * await dispatchWebhook(organisationId, 'lead.created', { lead });
 */
export async function dispatchWebhook(
    organisationId: string,
    eventType: string,
    payload: any
): Promise<{ dispatched: number; errors: string[] }> {
    // Find all active webhooks for this event
    const { data: webhooks, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('event_type', eventType)
        .eq('is_active', true);

    if (error || !webhooks || webhooks.length === 0) {
        return { dispatched: 0, errors: error ? [error.message] : [] };
    }

    const errors: string[] = [];
    let dispatched = 0;

    // Dispatch to each webhook (fire and forget)
    for (const webhook of webhooks) {
        try {
            // Call the Edge Function (non-blocking)
            supabase.functions.invoke('dispatch-webhook', {
                body: {
                    webhook_id: webhook.id,
                    organisation_id: organisationId,
                    event_type: eventType,
                    target_url: webhook.target_url,
                    payload: {
                        event: eventType,
                        timestamp: new Date().toISOString(),
                        data: payload
                    },
                    secret: webhook.secret,
                    headers: webhook.headers
                }
            }).catch(err => {
                console.error(`Failed to dispatch webhook ${webhook.id}:`, err);
            });

            dispatched++;
        } catch (err) {
            errors.push(`Webhook ${webhook.name}: ${(err as Error).message}`);
        }
    }

    return { dispatched, errors };
}

/**
 * Test a webhook by sending a sample payload
 */
export async function testWebhook(
    webhook: Webhook
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data, error } = await supabase.functions.invoke('dispatch-webhook', {
            body: {
                webhook_id: webhook.id,
                organisation_id: webhook.organisation_id,
                event_type: 'test',
                target_url: webhook.target_url,
                payload: {
                    event: 'test',
                    timestamp: new Date().toISOString(),
                    message: 'This is a test webhook from Momentum CRM',
                    data: {
                        test: true,
                        webhook_name: webhook.name
                    }
                },
                secret: webhook.secret,
                headers: webhook.headers
            }
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return data;
    } catch (err) {
        return { success: false, error: (err as Error).message };
    }
}

/**
 * Generate a random secret for webhook signature
 */
export function generateWebhookSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = 'whsec_';
    for (let i = 0; i < 32; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
}
