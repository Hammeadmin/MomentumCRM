/**
 * Email Service
 * 
 * Handles sending emails for contact form, demo requests, etc.
 * 
 * CONFIGURATION:
 * 1. Replace EMAIL_ENDPOINT with your actual email API endpoint
 * 2. You can use services like:
 *    - Resend (https://resend.com) - Already mentioned in integrations
 *    - SendGrid
 *    - Postmark
 *    - Your own backend endpoint
 */

// TODO: Replace with your actual email service endpoint
const EMAIL_ENDPOINT = '/api/email/send'; // or 'https://api.resend.com/emails'

// TODO: Replace with your actual API key (should be in env vars on backend)
// Note: Never expose API keys in frontend code - this should be handled by backend
const RECIPIENT_EMAIL = 'hej@momentum-crm.se'; // Your contact email

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

interface EmailResult {
    success: boolean;
    error?: string;
}

/**
 * Sends a contact form email
 */
export async function sendContactEmail(data: ContactFormData): Promise<EmailResult> {
    try {
        // For development/demo: simulate API call
        if (import.meta.env.DEV || !EMAIL_ENDPOINT.startsWith('http')) {
            console.log('📧 Contact Form Submission:', data);
            console.log('Would send to:', RECIPIENT_EMAIL);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { success: true };
        }

        // Production: actual API call
        const response = await fetch(EMAIL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: RECIPIENT_EMAIL,
                from: 'noreply@momentum-crm.se',
                replyTo: data.email,
                subject: `Ny kontaktförfrågan från ${data.name}`,
                html: `
          <h2>Ny kontaktförfrågan</h2>
          <p><strong>Namn:</strong> ${data.name}</p>
          <p><strong>E-post:</strong> ${data.email}</p>
          ${data.phone ? `<p><strong>Telefon:</strong> ${data.phone}</p>` : ''}
          ${data.company ? `<p><strong>Företag:</strong> ${data.company}</p>` : ''}
          ${data.employees ? `<p><strong>Antal anställda:</strong> ${data.employees}</p>` : ''}
          <p><strong>Meddelande:</strong></p>
          <p>${data.message.replace(/\n/g, '<br>')}</p>
        `,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to send email');
        }

        return { success: true };
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
        if (import.meta.env.DEV || !EMAIL_ENDPOINT.startsWith('http')) {
            console.log('📧 Demo Request Submission:', data);
            console.log('Would send to:', RECIPIENT_EMAIL);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { success: true };
        }

        // Production: actual API call
        const response = await fetch(EMAIL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: RECIPIENT_EMAIL,
                from: 'noreply@momentum-crm.se',
                replyTo: data.email,
                subject: `Ny demoförfrågan från ${data.company}`,
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
        `,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to send email');
        }

        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        return {
            success: false,
            error: 'Kunde inte skicka förfrågan. Försök igen eller kontakta oss direkt.'
        };
    }
}
