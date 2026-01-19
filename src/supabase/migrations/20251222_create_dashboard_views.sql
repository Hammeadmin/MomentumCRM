-- Drop existing view if it exists
DROP VIEW IF EXISTS view_dashboard_kpis;

-- Create the optimized KPI view
CREATE VIEW view_dashboard_kpis AS
SELECT
  o.id AS organisation_id,
  (
    SELECT COALESCE(SUM(i.amount), 0)
    FROM public.invoices i
    WHERE i.organisation_id = o.id
      AND i.status = 'paid'
  ) AS total_sales,
  (
    SELECT COUNT(*)
    FROM public.leads l
    WHERE l.organisation_id = o.id
      AND l.status NOT IN ('won', 'lost')
  ) AS active_leads,
  (
    SELECT COUNT(*)
    FROM public.jobs j
    WHERE j.organisation_id = o.id
      AND j.status IN ('pending', 'in_progress')
  ) AS active_jobs,
  (
    SELECT COUNT(*)
    FROM public.invoices i2
    WHERE i2.organisation_id = o.id
      AND i2.status = 'overdue'
  ) AS overdue_invoices
FROM public.organisations o;

-- Grant appropriate permissions
GRANT SELECT ON view_dashboard_kpis TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW view_dashboard_kpis IS 'Pre-calculated dashboard KPI metrics per organisation';