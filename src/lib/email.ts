/**
 * Email Service
 * 
 * Handles sending emails through the BYOE (Bring Your Own Email) system.
 * Uses the send-email Edge Function which:
 * 1. Checks for user's custom SMTP settings
 * 2. Falls back to system Resend account if no custom settings
 * 3. Always sets Reply-To to the user's email
 * 
 * CONFIGURATION:
 * - Uses Supabase Edge Function for email delivery
 * - User SMTP settings stored in user_smtp_settings table
 */

import { supabase } from './supabase';

const RECIPIENT_EMAIL = 'hej@momentum-crm.se'; // System contact email

export interface ContactFormData {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    employees?: string;
    message: string;
}

export interface DemoRequestData {
    name: string;
    email: string;
    phone: string;
    company: string;
    website?: string;
    employees?: string;
    industry?: string;
    currentSystem?: string;
}

export interface EmailPayload {
    to: string;
    subject: string;
    content?: string;
    html?: string;
    from_name?: string;
    communication_id?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: Array<{ filename: string; content: string }>;
}

interface EmailResult {
    success: boolean;
    error?: string;
    message_id?: string;
}

/**
 * Sends an email via the Edge Function
 * The Edge Function handles SMTP selection (user's custom or system Resend)
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
    try {
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: payload
        });

        if (error) {
            console.error('Edge function error:', error);
            return {
                success: false,
                error: error.message || 'Kunde inte skicka e-post. Försök igen.'
            };
        }

        if (data?.success) {
            return {
                success: true,
                message_id: data.message_id
            };
        }

        return {
            success: false,
            error: data?.error || 'Okänt fel vid e-postutskick.'
        };
    } catch (error) {
        console.error('Email send error:', error);
        return {
            success: false,
            error: 'Kunde inte ansluta till e-posttjänsten. Försök igen.'
        };
    }
}

/**
 * Sends a contact form email
 */
export async function sendContactEmail(data: ContactFormData): Promise<EmailResult> {
    try {
        // For development/demo: simulate API call
        if (import.meta.env.DEV) {
            console.log('📧 Contact Form Submission:', data);
            console.log('Would send to:', RECIPIENT_EMAIL);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { success: true };
        }

        // Production: use Edge Function
        return sendEmail({
            to: RECIPIENT_EMAIL,
            subject: `Ny kontaktförfrågan från ${data.name}`,
            from_name: data.name,
            html: `
                <h2>Ny kontaktförfrågan</h2>
                <p><strong>Namn:</strong> ${data.name}</p>
                <p><strong>E-post:</strong> ${data.email}</p>
                ${data.phone ? `<p><strong>Telefon:</strong> ${data.phone}</p>` : ''}
                ${data.company ? `<p><strong>Företag:</strong> ${data.company}</p>` : ''}
                ${data.employees ? `<p><strong>Antal anställda:</strong> ${data.employees}</p>` : ''}
                <p><strong>Meddelande:</strong></p>
                <p>${data.message.replace(/\n/g, '<br>')}</p>
            `
        });
    } catch (error) {
        console.error('Email send error:', error);
        return {
            success: false,
            error: 'Kunde inte skicka meddelandet. Försök igen eller kontakta oss direkt.'
        };
    }
}

/**
 * Sends a demo request email
 */
export async function sendDemoRequestEmail(data: DemoRequestData): Promise<EmailResult> {
    try {
        // For development/demo: simulate API call
        if (import.meta.env.DEV) {
            console.log('📧 Demo Request Submission:', data);
            console.log('Would send to:', RECIPIENT_EMAIL);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { success: true };
        }

        // Production: use Edge Function
        return sendEmail({
            to: RECIPIENT_EMAIL,
            subject: `Ny demoförfrågan från ${data.company}`,
            from_name: data.name,
            html: `
                <h2>Ny demoförfrågan</h2>
                <p><strong>Kontaktperson:</strong> ${data.name}</p>
                <p><strong>E-post:</strong> ${data.email}</p>
                <p><strong>Telefon:</strong> ${data.phone}</p>
                <p><strong>Företag:</strong> ${data.company}</p>
                ${data.website ? `<p><strong>Hemsida:</strong> ${data.website}</p>` : ''}
                ${data.employees ? `<p><strong>Antal anställda:</strong> ${data.employees}</p>` : ''}
                ${data.industry ? `<p><strong>Bransch:</strong> ${data.industry}</p>` : ''}
                ${data.currentSystem ? `<p><strong>Nuvarande system:</strong> ${data.currentSystem}</p>` : ''}
            `
        });
    } catch (error) {
        console.error('Email send error:', error);
        return {
            success: false,
            error: 'Kunde inte skicka förfrågan. Försök igen eller kontakta oss direkt.'
        };
    }
}

/**
 * Sends an email with custom parameters
 * Used for invoices, quotes, and other business communications
 */
export async function sendBusinessEmail(options: {
    to: string;
    subject: string;
    html: string;
    content?: string;
    from_name?: string;
    communication_id?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: Array<{ filename: string; content: string }>;
}): Promise<EmailResult> {
    return sendEmail(options);
}
