/**
 * SMS Integration Library (46elks)
 * 
 * Provides functions for sending SMS messages via the 46elks API.
 * Uses BYOK (Bring Your Own Key) model - organisations provide their own credentials.
 */

import { supabase } from './supabase';

// ============================================================================
// Interfaces
// ============================================================================

export interface SmsSettings {
    provider: string;
    apiUsername: string | null;
    apiPassword: string | null;
    senderName: string;
    isConfigured: boolean;
}

export interface SendSmsParams {
    to: string;
    message: string;
    orderId?: string;
}

export interface SendSmsResult {
    success: boolean;
    smsId?: string;
    cost?: number;
    error?: string;
}

// ============================================================================
// Settings Management
// ============================================================================

/**
 * Get SMS settings for an organisation
 */
export async function getSmsSettings(organisationId: string): Promise<SmsSettings> {
    const { data, error } = await supabase
        .from('organisations')
        .select('sms_provider, sms_api_username, sms_api_password, sms_sender_name')
        .eq('id', organisationId)
        .single();

    if (error || !data) {
        return {
            provider: '46elks',
            apiUsername: null,
            apiPassword: null,
            senderName: 'Momentum',
            isConfigured: false,
        };
    }

    return {
        provider: data.sms_provider || '46elks',
        apiUsername: data.sms_api_username,
        apiPassword: data.sms_api_password,
        senderName: data.sms_sender_name || 'Momentum',
        isConfigured: !!(data.sms_api_username && data.sms_api_password),
    };
}

/**
 * Save SMS settings for an organisation
 */
export async function saveSmsSettings(
    organisationId: string,
    settings: {
        apiUsername: string;
        apiPassword: string;
        senderName: string;
    }
): Promise<{ success: boolean; error?: string }> {
    // Validate sender name (max 11 chars for 46elks)
    if (settings.senderName.length > 11) {
        return { success: false, error: 'Sender name must be 11 characters or less' };
    }

    const { error } = await supabase
        .from('organisations')
        .update({
            sms_api_username: settings.apiUsername,
            sms_api_password: settings.apiPassword,
            sms_sender_name: settings.senderName,
        })
        .eq('id', organisationId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

// ============================================================================
// SMS Sending
// ============================================================================

/**
 * Format phone number to E.164 format
 * Handles Swedish phone numbers
 */
export function formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Handle Swedish numbers
    if (cleaned.startsWith('0')) {
        // Swedish number starting with 0, convert to +46
        cleaned = '+46' + cleaned.substring(1);
    } else if (cleaned.startsWith('46') && !cleaned.startsWith('+')) {
        // Swedish number without +
        cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+')) {
        // Assume Swedish if no country code
        cleaned = '+46' + cleaned;
    }

    return cleaned;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
    const formatted = formatPhoneNumber(phone);
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    return phoneRegex.test(formatted);
}

/**
 * Send an SMS message
 * 
 * @param organisationId - Organisation ID to fetch credentials
 * @param params - SMS parameters (to, message, optional orderId)
 * @param userId - User ID sending the SMS (for logging)
 */
export async function sendSms(
    organisationId: string,
    params: SendSmsParams,
    userId?: string
): Promise<SendSmsResult> {
    const { to, message, orderId } = params;

    // Validate phone number
    if (!isValidPhoneNumber(to)) {
        return { success: false, error: 'Invalid phone number format' };
    }

    // Validate message
    if (!message || message.trim().length === 0) {
        return { success: false, error: 'Message cannot be empty' };
    }

    try {
        const formattedPhone = formatPhoneNumber(to);

        const { data, error } = await supabase.functions.invoke('send-sms', {
            body: {
                to: formattedPhone,
                message,
                organisation_id: organisationId,
                order_id: orderId,
                created_by_user_id: userId,
            },
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
 * Send a test SMS to verify configuration
 */
export async function sendTestSms(
    organisationId: string,
    testPhone: string
): Promise<SendSmsResult> {
    return sendSms(organisationId, {
        to: testPhone,
        message: 'Test SMS from Momentum CRM. Your SMS integration is working correctly!',
    });
}

/**
 * Calculate SMS segments (for character count display)
 * Standard SMS: 160 chars, concatenated: 153 chars per segment
 */
export function calculateSmsSegments(message: string): {
    segments: number;
    remaining: number;
    total: number;
} {
    const length = message.length;

    if (length === 0) {
        return { segments: 0, remaining: 160, total: 0 };
    }

    if (length <= 160) {
        return { segments: 1, remaining: 160 - length, total: length };
    }

    // Concatenated SMS uses 153 chars per segment
    const segments = Math.ceil(length / 153);
    const remaining = (segments * 153) - length;

    return { segments, remaining, total: length };
}
