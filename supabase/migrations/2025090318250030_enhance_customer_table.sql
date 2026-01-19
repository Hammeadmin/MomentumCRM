-- Add columns for customer details that are missing

-- Sales area for the customer
ALTER TABLE public.customers
ADD COLUMN sales_area TEXT;

-- VAT handling: '25%' or 'omvänd byggmoms'. Defaults to '25%'.
ALTER TABLE public.customers
ADD COLUMN vat_handling TEXT NOT NULL DEFAULT '25%';

-- E-invoice address (optional)
ALTER TABLE public.customers
ADD COLUMN e_invoice_address TEXT;

-- Preferred delivery method for invoices
ALTER TABLE public.customers
ADD COLUMN invoice_delivery_method TEXT NOT NULL DEFAULT 'e-post';

-- Add organization number for companies
ALTER TABLE public.customers
ADD COLUMN org_number TEXT;