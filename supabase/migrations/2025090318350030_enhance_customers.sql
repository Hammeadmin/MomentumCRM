-- Add a column to distinguish between private and company customers
ALTER TABLE public.customers
ADD COLUMN customer_type TEXT NOT NULL DEFAULT 'company';

-- Add an index for faster lookups on customer type
CREATE INDEX idx_customers_customer_type ON public.customers(customer_type);