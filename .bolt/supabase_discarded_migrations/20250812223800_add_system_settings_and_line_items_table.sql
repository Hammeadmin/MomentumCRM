-- Create the system_settings table with all necessary columns
CREATE TABLE public.system_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organisation_id uuid NOT NULL,
    logo_url text NULL,
    default_payment_terms integer NOT NULL DEFAULT 30,
    late_fee numeric(10, 2) NULL,
    invoice_footer_text text NULL,
    invoice_number_format text NOT NULL DEFAULT 'F{YYYY}{MM}-{####}',
    invoice_number_prefix text NULL,
    invoice_number_start integer NOT NULL DEFAULT 1,
    quote_number_format text NOT NULL DEFAULT 'Q{YYYY}{MM}-{####}',
    quote_number_prefix text NULL,
    quote_number_start integer NOT NULL DEFAULT 1,
    default_vat_rate numeric(5, 2) NOT NULL DEFAULT 25.00,
    currency text NOT NULL DEFAULT 'SEK',
    date_format text NOT NULL DEFAULT 'YYYY-MM-DD',
    time_format text NOT NULL DEFAULT '24h',
    fiscal_year_start text NOT NULL DEFAULT '01-01',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NULL,
    CONSTRAINT system_settings_pkey PRIMARY KEY (id),
    CONSTRAINT system_settings_organisation_id_key UNIQUE (organisation_id),
    CONSTRAINT system_settings_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE
);

-- Add comments to explain the columns
COMMENT ON COLUMN public.system_settings.default_payment_terms IS 'Default number of days until an invoice is due.';
COMMENT ON COLUMN public.system_settings.late_fee IS 'Default late fee or interest rate for overdue invoices.';
COMMENT ON COLUMN public.system_settings.invoice_footer_text IS 'Custom text to display in the invoice footer.';
COMMENT ON COLUMN public.system_settings.invoice_number_format IS 'Formatting for generated invoice numbers. e.g., INV-{YYYY}-{####}';
COMMENT ON COLUMN public.system_settings.quote_number_format IS 'Formatting for generated quote numbers.';
COMMENT ON COLUMN public.system_settings.default_vat_rate IS 'Default VAT rate as a percentage.';
COMMENT ON COLUMN public.system_settings.currency IS 'Default currency, e.g., SEK, EUR, USD.';
COMMENT ON COLUMN public.system_settings.date_format IS 'Preferred date format, e.g., YYYY-MM-DD.';
COMMENT ON COLUMN public.system_settings.time_format IS 'Preferred time format, e.g., 24h or 12h.';
COMMENT ON COLUMN public.system_settings.fiscal_year_start IS 'Start of the fiscal year in MM-DD format.';


-- Enable Row Level Security (RLS)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- 1. Allow users to view settings for their own organization
CREATE POLICY "Allow authenticated users to view their own org settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (organisation_id = (
    SELECT organisation_id
    FROM user_profiles
    WHERE id = auth.uid()
));

-- 2. Allow users to insert settings for their own organization
CREATE POLICY "Allow authenticated users to insert their own org settings"
ON public.system_settings
FOR INSERT
TO authenticated
WITH CHECK (organisation_id = (
    SELECT organisation_id
    FROM user_profiles
    WHERE id = auth.uid()
));

-- 3. Allow users to update settings for their own organization
CREATE POLICY "Allow authenticated users to update their own org settings"
ON public.system_settings
FOR UPDATE
TO authenticated
USING (organisation_id = (
    SELECT organisation_id
    FROM user_profiles
    WHERE id = auth.uid()
));

-- ### START OF NEW CODE ###

-- Create the saved_line_items table for reusable products/services
CREATE TABLE public.saved_line_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organisation_id uuid NOT NULL,
    name text NOT NULL,
    description text NULL,
    unit_price numeric(10, 2) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT saved_line_items_pkey PRIMARY KEY (id),
    CONSTRAINT saved_line_items_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE
);

-- Add comments to explain the columns
COMMENT ON TABLE public.saved_line_items IS 'Stores reusable products and services for invoices and quotes.';
COMMENT ON COLUMN public.saved_line_items.name IS 'A short name for the item, e.g., Takrensning.';
COMMENT ON COLUMN public.saved_line_items.description IS 'A longer description of the service or product.';
COMMENT ON COLUMN public.saved_line_items.unit_price IS 'The default price for this item.';

-- Enable Row Level Security (RLS) for the new table
ALTER TABLE public.saved_line_items ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_line_items
-- 1. Allow users to view items for their own organization
CREATE POLICY "Allow authenticated users to view their own saved items"
ON public.saved_line_items
FOR SELECT
TO authenticated
USING (organisation_id = (
    SELECT organisation_id
    FROM user_profiles
    WHERE id = auth.uid()
));

-- 2. Allow users to insert items for their own organization
CREATE POLICY "Allow authenticated users to insert their own saved items"
ON public.saved_line_items
FOR INSERT
TO authenticated
WITH CHECK (organisation_id = (
    SELECT organisation_id
    FROM user_profiles
    WHERE id = auth.uid()
));

-- 3. Allow users to update items for their own organization
CREATE POLICY "Allow authenticated users to update their own saved items"
ON public.saved_line_items
FOR UPDATE
TO authenticated
USING (organisation_id = (
    SELECT organisation_id
    FROM user_profiles
    WHERE id = auth.uid()
));

-- 4. Allow users to delete items for their own organization
CREATE POLICY "Allow authenticated users to delete their own saved items"
ON public.saved_line_items
FOR DELETE
TO authenticated
USING (organisation_id = (
    SELECT organisation_id
    FROM user_profiles
    WHERE id = auth.uid()
));

-- ### END OF NEW CODE ###
