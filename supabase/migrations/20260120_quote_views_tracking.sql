/*
# Quote Views Tracking & Acceptance Notifications

1. New table: quote_views
   - Tracks every time a customer views a quote email
   - Stores IP, user agent, referrer for analytics
   - Follows same pattern as intranet_post_views table

2. Features
   - Anonymous insert (for tracking pixel)
   - Authenticated read (for viewing analytics)
   - Index on quote_id for fast lookups
*/

-- Create quote_views table (similar structure to intranet_post_views)
CREATE TABLE IF NOT EXISTS public.quote_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now() NOT NULL,
  ip_address text,
  user_agent text,
  referrer text
);

-- Add comment for documentation
COMMENT ON TABLE public.quote_views IS 'Tracks quote email opens via tracking pixel';

-- Index for fast lookups by quote (matching your existing pattern)
CREATE INDEX IF NOT EXISTS idx_quote_views_quote_id ON public.quote_views(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_views_viewed_at ON public.quote_views(viewed_at DESC);

-- Enable RLS
ALTER TABLE public.quote_views ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert (for tracking pixel from emails)
-- Uses anon role since the pixel is loaded without authentication
CREATE POLICY "Anyone can insert quote views"
  ON public.quote_views 
  FOR INSERT 
  TO anon
  WITH CHECK (true);

-- Also allow authenticated users to insert (fallback)
CREATE POLICY "Authenticated can insert quote views"
  ON public.quote_views 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to view their organisation's quote views
-- Follows your existing pattern of checking organisation membership
CREATE POLICY "Org members can select their quote views"
  ON public.quote_views 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      JOIN public.user_profiles up ON up.organisation_id = q.organisation_id
      WHERE q.id = quote_views.quote_id
        AND up.id = auth.uid()
    )
  );

-- Create a helper view for quote analytics (similar to how you have view_dashboard_kpis)
CREATE OR REPLACE VIEW public.quote_view_analytics AS
SELECT 
  q.id as quote_id,
  q.quote_number,
  q.title,
  q.status,
  q.customer_id,
  q.organisation_id,
  COUNT(qv.id) as total_views,
  COUNT(DISTINCT qv.ip_address) as unique_visitors,
  MIN(qv.viewed_at) as first_viewed_at,
  MAX(qv.viewed_at) as last_viewed_at
FROM public.quotes q
LEFT JOIN public.quote_views qv ON q.id = qv.quote_id
GROUP BY q.id, q.quote_number, q.title, q.status, q.customer_id, q.organisation_id;

-- Grant access to the analytics view
GRANT SELECT ON public.quote_view_analytics TO authenticated;
