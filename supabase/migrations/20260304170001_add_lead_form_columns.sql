-- Migration: Add form-related columns to leads table
-- form_id: links a lead back to the form that created it
-- form_data: stores the raw submitted field values as JSONB
-- city: denormalized for fast filtering without joining customers

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS form_id uuid REFERENCES lead_forms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS form_data jsonb,
  ADD COLUMN IF NOT EXISTS city text;

-- Index for filtering leads by source form
CREATE INDEX idx_leads_form_id ON public.leads(form_id) WHERE form_id IS NOT NULL;

-- Index for city-based filtering
CREATE INDEX idx_leads_city ON public.leads(city) WHERE city IS NOT NULL;
