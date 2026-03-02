import { z } from 'zod';

// =============================================================================
// Lead Schema
// =============================================================================

export const leadCreateSchema = z.object({
    organisation_id: z.string().uuid({ message: 'Ogiltig organisations-ID' }).optional().nullable(),
    title: z.string().min(1, { message: 'Titel är obligatoriskt' }),
    description: z.string().optional().nullable(),
    customer_id: z.string().uuid({ message: 'Ogiltig kund-ID' }).optional().nullable(),
    assigned_to_user_id: z.string().uuid({ message: 'Ogiltig användar-ID' }).optional().nullable(),
    source: z.string().optional().nullable(),
    status: z.enum(['new', 'contacted', 'qualified', 'won', 'lost'], {
        errorMap: () => ({ message: 'Ogiltig status' }),
    }).default('new'),
    estimated_value: z.number().min(0, { message: 'Värdet måste vara positivt' }).optional().nullable(),
    lead_score: z.number().min(0).max(100, { message: 'Poäng måste vara mellan 0 och 100' }).optional().nullable(),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;

// =============================================================================
// Quote Schema
// =============================================================================

export const quoteCreateSchema = z.object({
    organisation_id: z.string().uuid({ message: 'Ogiltig organisations-ID' }).optional().nullable(),
    title: z.string().min(1, { message: 'Titel är obligatoriskt' }),
    quote_number: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    customer_id: z.string().uuid({ message: 'Ogiltig kund-ID' }).optional().nullable(),
    lead_id: z.string().uuid({ message: 'Ogiltig lead-ID' }).optional().nullable(),
    order_id: z.string().uuid({ message: 'Ogiltig order-ID' }).optional().nullable(),
    total_amount: z.number().min(0, { message: 'Totalbelopp måste vara positivt' }),
    subtotal: z.number().min(0, { message: 'Delsumma måste vara positiv' }).optional().nullable(),
    vat_amount: z.number().min(0, { message: 'Momsbelopp måste vara positivt' }).optional().nullable(),
    status: z.enum(['draft', 'sent', 'accepted', 'declined'], {
        errorMap: () => ({ message: 'Ogiltig status' }),
    }).default('draft'),
    valid_until: z.string().optional().nullable(),

    // ROT fields
    include_rot: z.boolean().optional().nullable(),
    rot_personnummer: z.string().optional().nullable(),
    rot_organisationsnummer: z.string().optional().nullable(),
    rot_fastighetsbeteckning: z.string().optional().nullable(),
    rot_amount: z.number().min(0, { message: 'ROT-belopp måste vara positivt' }).optional().nullable(),

    // RUT fields
    include_rut: z.boolean().optional().nullable(),
    rut_personnummer: z.string().optional().nullable(),
    rut_amount: z.number().min(0, { message: 'RUT-belopp måste vara positivt' }).optional().nullable(),
});

export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>;

// =============================================================================
// Order Schema
// =============================================================================

const baseOrderSchema = z.object({
    organisation_id: z.string().uuid({ message: 'Ogiltig organisations-ID' }).optional().nullable(),
    title: z.string().min(1, { message: 'Titel är obligatoriskt' }),
    description: z.string().optional().nullable(),
    customer_id: z.string().uuid({ message: 'Ogiltig kund-ID' }).optional().nullable(),
    value: z.number().min(0, { message: 'Värdet måste vara positivt' }).optional().nullable(),
    job_description: z.string().optional().nullable(),
    job_type: z.enum(['fönsterputsning', 'taktvätt', 'fasadtvätt', 'allmänt'], {
        errorMap: () => ({ message: 'Ogiltig jobbtyp' }),
    }).optional().nullable(),
    estimated_hours: z.number().min(0, { message: 'Timmar måste vara positiva' }).optional().nullable(),
    complexity_level: z.number().min(1).max(5, { message: 'Komplexitetsnivå måste vara mellan 1 och 5' }).optional().nullable(),
    status: z.enum([
        'förfrågan',
        'offert_skapad',
        'öppen_order',
        'bokad_bekräftad',
        'avbokad_kund',
        'ej_slutfört',
        'redo_fakturera',
        'fakturerad',
    ], {
        errorMap: () => ({ message: 'Ogiltig status' }),
    }).default('öppen_order'),
    source: z.string().optional().nullable(),

    // ROT fields
    include_rot: z.boolean().optional().nullable(),
    rot_personnummer: z.string().optional().nullable(),
    rot_organisationsnummer: z.string().optional().nullable(),
    rot_fastighetsbeteckning: z.string().optional().nullable(),
    rot_amount: z.number().min(0, { message: 'ROT-belopp måste vara positivt' }).optional().nullable(),

    // RUT fields
    include_rut: z.boolean().optional().nullable(),
    rut_personnummer: z.string().optional().nullable(),
    rut_amount: z.number().min(0, { message: 'RUT-belopp måste vara positivt' }).optional().nullable(),

    // Commission fields
    primary_salesperson_id: z.string().uuid({ message: 'Ogiltig säljare-ID' }).optional().nullable(),
    secondary_salesperson_id: z.string().uuid({ message: 'Ogiltig säljare-ID' }).optional().nullable(),
    commission_split_percentage: z.number().min(0).max(100, { message: 'Provisionssplit måste vara mellan 0 och 100' }).optional().nullable(),
    commission_amount: z.number().min(0, { message: 'Provisionsbelopp måste vara positivt' }).optional().nullable(),
    commission_paid: z.boolean().optional().nullable(),

    // Assignment fields
    assignment_type: z.enum(['individual', 'team'], {
        errorMap: () => ({ message: 'Ogiltig tilldelningstyp' }),
    }).optional().nullable(),
    assigned_to_user_id: z.string().uuid({ message: 'Ogiltig användar-ID' }).optional().nullable(),
    assigned_to_team_id: z.string().uuid({ message: 'Ogiltig team-ID' }).optional().nullable(),
});

export const orderCreateSchema = baseOrderSchema.superRefine((data, ctx) => {
    if (data.assignment_type === 'team') {
        if (!data.assigned_to_team_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Team måste anges när tilldelningstyp är "team"',
                path: ['assigned_to_team_id'],
            });
        }
    } else if (data.assignment_type === 'individual') {
        if (!data.assigned_to_user_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Användare måste anges när tilldelningstyp är "individual"',
                path: ['assigned_to_user_id'],
            });
        }
    }
});

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;

// =============================================================================
// Safe parse helpers with proper error handling
// =============================================================================

export interface ValidationResult<T> {
    success: true;
    data: T;
}

export interface ValidationError {
    success: false;
    errors: Record<string, string>;
}

export type ParseResult<T> = ValidationResult<T> | ValidationError;

export function formatZodErrors(error: z.ZodError): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const issue of error.issues) {
        const path = issue.path.length > 0 ? issue.path.join('.') : '_root';
        if (!errors[path]) {
            errors[path] = issue.message;
        }
    }
    return errors;
}

export function parseOrder(data: unknown): ParseResult<OrderCreateInput> {
    const result = orderCreateSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: formatZodErrors(result.error) };
}

export function parseLead(data: unknown): ParseResult<LeadCreateInput> {
    const result = leadCreateSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: formatZodErrors(result.error) };
}

export function parseQuote(data: unknown): ParseResult<QuoteCreateInput> {
    const result = quoteCreateSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: formatZodErrors(result.error) };
}

// =============================================================================
// Invoice Schema
// =============================================================================

export const invoiceLineItemSchema = z.object({
    description: z.string().min(1, { message: 'Beskrivning är obligatoriskt' }),
    quantity: z.number().min(0, { message: 'Antal måste vara positivt' }),
    unit_price: z.number().min(0, { message: 'Pris måste vara positivt' }),
    total: z.number(),
});

export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;

export const invoiceCreateSchema = z.object({
    customer_id: z.string().uuid({ message: 'Ogiltig kund-ID' }),
    order_id: z.string().uuid({ message: 'Ogiltig order-ID' }).optional().nullable(),
    due_date: z.string().optional().nullable(),
    line_items: z.array(invoiceLineItemSchema).min(1, { message: 'Minst en fakturarad krävs' }),
    job_description: z.string().optional().nullable(),

    // ROT fields
    include_rot: z.boolean().optional().nullable(),
    rot_personnummer: z.string().optional().nullable(),
    rot_organisationsnummer: z.string().optional().nullable(),
    rot_fastighetsbeteckning: z.string().optional().nullable(),
    rot_amount: z.number().min(0, { message: 'ROT-belopp måste vara positivt' }).optional().nullable(),

    // RUT fields
    include_rut: z.boolean().optional().nullable(),
    rut_personnummer: z.string().optional().nullable(),
    rut_amount: z.number().min(0, { message: 'RUT-belopp måste vara positivt' }).optional().nullable(),

    // Assignment fields
    assignment_type: z.enum(['individual', 'team'], {
        errorMap: () => ({ message: 'Ogiltig tilldelningstyp' }),
    }).optional().nullable(),
    assigned_user_id: z.string().uuid({ message: 'Ogiltig användar-ID' }).optional().nullable(),
    assigned_team_id: z.string().uuid({ message: 'Ogiltig team-ID' }).optional().nullable(),
});

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;

export function parseInvoice(data: unknown): ParseResult<InvoiceCreateInput> {
    const result = invoiceCreateSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: formatZodErrors(result.error) };
}
