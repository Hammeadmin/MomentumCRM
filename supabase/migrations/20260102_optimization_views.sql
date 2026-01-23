-- ============================================================================
-- OPTIMIZATION VIEWS AND FUNCTIONS MIGRATION
-- Purpose: Replace client-side aggregation with efficient SQL Views and Functions
-- ============================================================================

-- ============================================================================
-- 1. ACTIVITY FEED VIEW
-- Combines leads, orders, invoices, and jobs into a single unified activity feed
-- Fixes fragmentation issue where client fetches 4 tables separately
-- ============================================================================

CREATE OR REPLACE VIEW view_recent_activity AS
SELECT 
    id,
    created_at,
    'lead' AS activity_type,
    title,
    assigned_to_user_id AS user_id,
    organisation_id,
    status::text AS status
FROM leads
WHERE created_at > NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
    id,
    created_at,
    'order' AS activity_type,
    title,
    assigned_to_user_id AS user_id,
    organisation_id,
    status::text AS status
FROM orders
WHERE created_at > NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
    id,
    created_at,
    'invoice' AS activity_type,
    invoice_number AS title,
    NULL AS user_id,
    organisation_id,
    status::text AS status
FROM invoices
WHERE created_at > NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
    id,
    created_at,
    'job' AS activity_type,
    title,
    assigned_to_user_id AS user_id,
    organisation_id,
    status::text AS status
FROM jobs
WHERE created_at > NOW() - INTERVAL '30 days';

-- Grant access to the view
GRANT SELECT ON view_recent_activity TO authenticated;

-- ============================================================================
-- 2. DOCUMENT STATS RPC FUNCTION
-- Returns aggregated document statistics in a single query
-- Replaces client-side aggregation in src/lib/documents.ts
-- ============================================================================

CREATE OR REPLACE FUNCTION get_document_stats(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    stats_record RECORD;
BEGIN
    SELECT 
        COUNT(*) AS total_documents,
        COALESCE(SUM(download_count), 0) AS total_downloads,
        COALESCE(SUM(file_size), 0) AS storage_used
    INTO stats_record
    FROM documents
    WHERE organisation_id = org_id AND is_active = true;

    -- Build the result JSON with category counts
    SELECT jsonb_build_object(
        'total_documents', stats_record.total_documents,
        'total_downloads', stats_record.total_downloads,
        'storage_used', stats_record.storage_used,
        'category_counts', COALESCE(
            (SELECT jsonb_object_agg(category, cnt)
             FROM (
                 SELECT category, COUNT(*) AS cnt
                 FROM documents
                 WHERE organisation_id = org_id AND is_active = true
                 GROUP BY category
             ) sub
            ), '{}'::jsonb
        ),
        'recent_uploads', COALESCE(
            (SELECT jsonb_agg(row_to_json(d))
             FROM (
                 SELECT id, filename, category, created_at, download_count
                 FROM documents
                 WHERE organisation_id = org_id AND is_active = true
                 ORDER BY created_at DESC
                 LIMIT 5
             ) d
            ), '[]'::jsonb
        ),
        'top_downloaded', COALESCE(
            (SELECT jsonb_agg(row_to_json(d))
             FROM (
                 SELECT id, filename, category, created_at, download_count
                 FROM documents
                 WHERE organisation_id = org_id AND is_active = true
                 ORDER BY download_count DESC
                 LIMIT 5
             ) d
            ), '[]'::jsonb
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_document_stats(uuid) TO authenticated;

-- ============================================================================
-- 3. OPTIMIZED RLS POLICY FOR ORDER_ATTACHMENTS
-- Rewrite to improve query planner performance with indexed lookups
-- ============================================================================

-- First, ensure we have the required indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to_user_id 
ON orders (assigned_to_user_id);

CREATE INDEX IF NOT EXISTS idx_orders_organisation_id_assigned 
ON orders (organisation_id, assigned_to_user_id);

-- Drop existing inefficient SELECT policy
DROP POLICY IF EXISTS "Allow SELECT on attachments for assigned workers" ON public.order_attachments;

-- Create more efficient RLS policy using a JOIN-friendly pattern
-- The query planner can now use the index on orders(id) and orders(assigned_to_user_id)
CREATE POLICY "Allow SELECT on attachments for assigned workers"
ON public.order_attachments FOR SELECT
USING (
    order_id IN (
        SELECT id FROM public.orders 
        WHERE assigned_to_user_id = auth.uid()
    )
);

-- Also optimize the INSERT policy with the same pattern
DROP POLICY IF EXISTS "Allow INSERT on attachments for assigned workers" ON public.order_attachments;

CREATE POLICY "Allow INSERT on attachments for assigned workers"
ON public.order_attachments FOR INSERT
WITH CHECK (
    order_id IN (
        SELECT id FROM public.orders 
        WHERE assigned_to_user_id = auth.uid()
    )
);

-- ============================================================================
-- 4. DASHBOARD ACTIVITY SUMMARY FUNCTION
-- Pre-computed counts for dashboard widgets
-- ============================================================================

CREATE OR REPLACE FUNCTION get_activity_summary(org_id uuid, days_back int DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN jsonb_build_object(
        'new_leads', (
            SELECT COUNT(*) FROM leads 
            WHERE organisation_id = org_id 
            AND created_at > NOW() - (days_back || ' days')::interval
        ),
        'new_orders', (
            SELECT COUNT(*) FROM orders 
            WHERE organisation_id = org_id 
            AND created_at > NOW() - (days_back || ' days')::interval
        ),
        'new_invoices', (
            SELECT COUNT(*) FROM invoices 
            WHERE organisation_id = org_id 
            AND created_at > NOW() - (days_back || ' days')::interval
        ),
        'completed_jobs', (
            SELECT COUNT(*) FROM jobs 
            WHERE organisation_id = org_id 
            AND status = 'completed'
            AND updated_at > NOW() - (days_back || ' days')::interval
        ),
        'period_days', days_back
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_activity_summary(uuid, int) TO authenticated;
