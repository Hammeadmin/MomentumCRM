-- Allow anonymous (public) read access to active lead forms
-- Required for the /forms/:formId public page and embed snippets
CREATE POLICY "public_read_active_forms" ON public.lead_forms
  FOR SELECT
  USING (is_active = true);
