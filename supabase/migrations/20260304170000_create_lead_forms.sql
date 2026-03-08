-- Migration: Create lead_forms table for web-to-lead form capture
-- This stores form configurations that generate embeddable forms for customer websites

CREATE TABLE public.lead_forms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  form_config jsonb NOT NULL DEFAULT '{}',
  -- form_config shape:
  -- {
  --   fields: FormField[],
  --   settings: {
  --     submitButtonText: string,
  --     successMessage: string,
  --     redirectUrl?: string,
  --     emailNotification: boolean,
  --     autoAssignUserId?: string,
  --     leadSource: string,
  --     linkedProductId?: string
  --   }
  -- }
  is_active boolean NOT NULL DEFAULT true,
  submission_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: users can only see their own organisation's forms
ALTER TABLE public.lead_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.lead_forms
  USING (organisation_id = get_my_org());

-- Auto-update updated_at on changes
CREATE TRIGGER set_lead_forms_updated_at
  BEFORE UPDATE ON public.lead_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for fast lookups by organisation
CREATE INDEX idx_lead_forms_organisation_id ON public.lead_forms(organisation_id);

-- Index for edge function lookups (public, by id + active)
CREATE INDEX idx_lead_forms_id_active ON public.lead_forms(id) WHERE is_active = true;
