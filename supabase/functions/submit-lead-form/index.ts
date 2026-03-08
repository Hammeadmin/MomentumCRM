/*
 * submit-lead-form Edge Function
 *
 * PUBLIC endpoint — no auth required.
 * Website visitors POST form data here to create leads.
 *
 * POST body: { form_id: string, fields: Record<string, any> }
 *
 * Flow:
 * 1. Validate form_id exists and is active
 * 2. Extract standard fields (name, email, phone, address, city, message)
 * 3. Find or create customer
 * 4. Create lead
 * 5. Increment submission_count
 * 6. Log to webhook_logs
 * 7. Return success/error
 */

import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Field alias maps — Swedish + English common variations
const NAME_KEYS = ['name', 'namn', 'full_name', 'fullname', 'fullständigt_namn'];
const EMAIL_KEYS = ['email', 'epost', 'e-post', 'e_post', 'mail'];
const PHONE_KEYS = ['phone', 'telefon', 'phone_number', 'tel', 'telefonnummer', 'mobilnummer'];
const ADDRESS_KEYS = ['address', 'adress', 'gatuadress', 'street'];
const POSTAL_KEYS = ['postal_code', 'postnummer', 'zip', 'zipcode', 'postkod'];
const CITY_KEYS = ['city', 'ort', 'stad', 'postort'];
const MESSAGE_KEYS = ['message', 'meddelande', 'beskrivning', 'description', 'kommentar', 'comment'];

function extractField(fields: Record<string, any>, aliases: string[]): string | null {
    const lowerFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(fields)) {
        lowerFields[key.toLowerCase().trim()] = value;
    }
    for (const alias of aliases) {
        const val = lowerFields[alias];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
        }
    }
    return null;
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ success: false, error: 'Only POST requests are accepted' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let requestBody: any;

    try {
        requestBody = await req.json();
    } catch {
        return new Response(
            JSON.stringify({ success: false, error: 'Invalid JSON body' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const { form_id, fields } = requestBody;

    if (!form_id || !fields || typeof fields !== 'object') {
        return new Response(
            JSON.stringify({ success: false, error: 'Missing form_id or fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        // 1. Validate form exists and is active
        const { data: form, error: formError } = await supabase
            .from('lead_forms')
            .select('*')
            .eq('id', form_id)
            .eq('is_active', true)
            .single();

        if (formError || !form) {
            return new Response(
                JSON.stringify({ success: false, error: 'Formuläret finns inte eller är inaktivt' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const orgId = form.organisation_id;
        const formConfig = form.form_config || {};
        const settings = formConfig.settings || {};

        // 2. Extract standard fields
        const customerName = extractField(fields, NAME_KEYS);
        const customerEmail = extractField(fields, EMAIL_KEYS);
        const customerPhone = extractField(fields, PHONE_KEYS);
        const customerAddress = extractField(fields, ADDRESS_KEYS);
        const customerPostalCode = extractField(fields, POSTAL_KEYS);
        const customerCity = extractField(fields, CITY_KEYS);
        const leadMessage = extractField(fields, MESSAGE_KEYS);

        // Validate email format if provided
        if (customerEmail && !isValidEmail(customerEmail)) {
            return new Response(
                JSON.stringify({ success: false, error: 'Ogiltig e-postadress' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 3. Customer creation logic
        let customerId: string | null = null;

        if (customerEmail) {
            // Check if customer exists by email in same organisation
            const { data: existingCustomer } = await supabase
                .from('customers')
                .select('id')
                .eq('organisation_id', orgId)
                .ilike('email', customerEmail)
                .limit(1)
                .single();

            if (existingCustomer) {
                customerId = existingCustomer.id;
            }
        }

        if (!customerId) {
            // Create new customer
            const { data: newCustomer, error: customerError } = await supabase
                .from('customers')
                .insert([{
                    organisation_id: orgId,
                    name: customerName || 'Okänd',
                    email: customerEmail || null,
                    phone_number: customerPhone || null,
                    address: customerAddress || null,
                    postal_code: customerPostalCode || null,
                    city: customerCity || null,
                    customer_type: 'private',
                }])
                .select('id')
                .single();

            if (customerError) {
                console.error('Customer creation error:', customerError);
                throw new Error('Could not create customer');
            }

            customerId = newCustomer.id;
        }

        // 4. Build lead description
        // Use the message field, or stringify non-standard fields
        let leadDescription = leadMessage;
        if (!leadDescription) {
            const standardKeys = [
                ...NAME_KEYS, ...EMAIL_KEYS, ...PHONE_KEYS,
                ...ADDRESS_KEYS, ...POSTAL_KEYS, ...CITY_KEYS, ...MESSAGE_KEYS
            ];
            const extraFields: Record<string, any> = {};
            for (const [key, value] of Object.entries(fields)) {
                if (!standardKeys.includes(key.toLowerCase().trim())) {
                    extraFields[key] = value;
                }
            }
            if (Object.keys(extraFields).length > 0) {
                leadDescription = Object.entries(extraFields)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join('\n');
            }
        }

        // 5. Create lead
        const leadTitle = `${form.name} - ${customerName || 'Ny förfrågan'}`;
        const leadSource = settings.leadSource || 'Webbformulär';

        const { error: leadError } = await supabase
            .from('leads')
            .insert([{
                organisation_id: orgId,
                customer_id: customerId,
                title: leadTitle,
                description: leadDescription || null,
                source: leadSource,
                status: 'new',
                form_id: form_id,
                form_data: fields,
                city: customerCity || null,
                assigned_to_user_id: settings.autoAssignUserId || null,
                estimated_value: null,
            }]);

        if (leadError) {
            console.error('Lead creation error:', leadError);
            throw new Error('Could not create lead');
        }

        // 6. Increment submission_count
        await supabase.rpc('increment_counter', undefined).catch(() => {
            // Fallback: manual increment
        });
        // Direct update since no RPC exists yet
        await supabase
            .from('lead_forms')
            .update({ submission_count: (form.submission_count || 0) + 1 })
            .eq('id', form_id);

        // 7. Log to webhook_logs for audit trail
        await supabase.from('webhook_logs').insert({
            webhook_id: null,
            organisation_id: orgId,
            event_type: 'form_submission',
            payload: requestBody,
            response_status: 200,
            response_body: null,
            success: true,
            error_message: null,
            duration_ms: 0,
        }).catch(err => {
            console.error('Webhook log error (non-fatal):', err);
        });

        // 8. Return success
        const successMessage = settings.successMessage || 'Tack för din förfrågan!';

        return new Response(
            JSON.stringify({ success: true, message: successMessage }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: unknown) {
        console.error('Error in submit-lead-form:', error);

        // Log failure to webhook_logs
        try {
            const orgId = requestBody?.form_id ? null : null; // Can't reliably get org_id on error
            await supabase.from('webhook_logs').insert({
                webhook_id: null,
                organisation_id: null,
                event_type: 'form_submission',
                payload: requestBody,
                response_status: 500,
                response_body: null,
                success: false,
                error_message: error instanceof Error ? error.message : 'Unknown error',
                duration_ms: 0,
            });
        } catch {
            // Silent fail — don't let logging break the error response
        }

        return new Response(
            JSON.stringify({ success: false, error: 'Ett fel uppstod. Försök igen senare.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
