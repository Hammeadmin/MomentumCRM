-- Migration: Dashboard and Payroll RPC Functions
-- Purpose: Move heavy client-side aggregation loops to server-side SQL

-- ============================================================================
-- FUNCTION: get_dashboard_stats
-- Returns dashboard statistics for an organisation
-- ============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    orders_total numeric;
    leads_by_status jsonb;
    jobs_by_status jsonb;
    current_month_start date;
    current_month_end date;
BEGIN
    -- Calculate current month boundaries
    current_month_start := date_trunc('month', CURRENT_DATE)::date;
    current_month_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date;

    -- Sum of total_amount from orders for current month
    SELECT COALESCE(SUM(total_amount), 0)
    INTO orders_total
    FROM orders
    WHERE organisation_id = org_id
      AND created_at >= current_month_start
      AND created_at <= current_month_end;

    -- Count of leads by status
    SELECT COALESCE(
        jsonb_object_agg(status, cnt),
        '{}'::jsonb
    )
    INTO leads_by_status
    FROM (
        SELECT status, COUNT(*) as cnt
        FROM leads
        WHERE organisation_id = org_id
        GROUP BY status
    ) lead_counts;

    -- Count of jobs by status
    SELECT COALESCE(
        jsonb_object_agg(status, cnt),
        '{}'::jsonb
    )
    INTO jobs_by_status
    FROM (
        SELECT status, COUNT(*) as cnt
        FROM jobs
        WHERE organisation_id = org_id
        GROUP BY status
    ) job_counts;

    -- Build result JSON
    result := jsonb_build_object(
        'orders_total_this_month', orders_total,
        'leads_by_status', leads_by_status,
        'jobs_by_status', jobs_by_status
    );

    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_stats(uuid) TO authenticated;


-- ============================================================================
-- FUNCTION: get_payroll_summary
-- Returns payroll summary for all employees in an organisation for a period
-- ============================================================================

CREATE OR REPLACE FUNCTION get_payroll_summary(
    org_id uuid,
    start_date date,
    end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Build payroll summary for all employees
    SELECT COALESCE(
        jsonb_agg(employee_summary ORDER BY full_name),
        '[]'::jsonb
    )
    INTO result
    FROM (
        SELECT jsonb_build_object(
            'employee_id', up.id,
            'full_name', up.full_name,
            'email', up.email,
            'employment_type', up.employment_type,
            'base_hourly_rate', up.base_hourly_rate,
            'base_monthly_salary', up.base_monthly_salary,
            'has_commission', up.has_commission,
            'commission_rate', up.commission_rate,
            'weekly_hours', COALESCE(up.weekly_hours, 40),
            -- Time log calculations
            'total_logged_minutes', COALESCE(time_stats.total_minutes, 0),
            'total_logged_hours', ROUND(COALESCE(time_stats.total_minutes, 0) / 60.0, 2),
            -- Attendance calculations
            'present_days', COALESCE(attendance_stats.present_days, 0),
            'sick_days', COALESCE(attendance_stats.sick_days, 0),
            'vacation_days', COALESCE(attendance_stats.vacation_days, 0),
            -- Commission calculations (only invoiced orders)
            'commission_orders_count', COALESCE(commission_stats.order_count, 0),
            'commission_orders_value', COALESCE(commission_stats.total_value, 0),
            'primary_commission', COALESCE(commission_stats.primary_commission, 0),
            'secondary_commission', COALESCE(commission_stats.secondary_commission, 0),
            -- Calculated pay fields
            'regular_hours', LEAST(
                GREATEST(
                    ROUND(COALESCE(time_stats.total_minutes, 0) / 60.0, 2),
                    COALESCE(attendance_stats.present_days, 0) * 
                        (COALESCE(up.weekly_hours, 40) / COALESCE(CARDINALITY(up.work_days), 5))
                ),
                COALESCE(up.weekly_hours, 40) * 4 -- Monthly cap
            ),
            'overtime_hours', GREATEST(0,
                ROUND(COALESCE(time_stats.total_minutes, 0) / 60.0, 2) - (COALESCE(up.weekly_hours, 40) * 4)
            ),
            -- Base pay calculation
            'base_pay', CASE
                WHEN up.employment_type = 'salary' THEN COALESCE(up.base_monthly_salary, 0)
                WHEN up.employment_type = 'hourly' THEN 
                    COALESCE(up.base_hourly_rate, 0) * GREATEST(
                        ROUND(COALESCE(time_stats.total_minutes, 0) / 60.0, 2),
                        COALESCE(attendance_stats.present_days, 0) * 
                            (COALESCE(up.weekly_hours, 40) / COALESCE(CARDINALITY(up.work_days), 5))
                    )
                ELSE 0
            END,
            -- Overtime pay (1.5x for hourly)
            'overtime_pay', CASE
                WHEN up.employment_type = 'hourly' AND 
                     ROUND(COALESCE(time_stats.total_minutes, 0) / 60.0, 2) > (COALESCE(up.weekly_hours, 40) * 4)
                THEN COALESCE(up.base_hourly_rate, 0) * 1.5 * 
                     GREATEST(0, ROUND(COALESCE(time_stats.total_minutes, 0) / 60.0, 2) - (COALESCE(up.weekly_hours, 40) * 4))
                ELSE 0
            END,
            -- Commission earnings
            'commission_earnings', 
                COALESCE(commission_stats.primary_commission, 0) + 
                COALESCE(commission_stats.secondary_commission, 0),
            -- Sick pay (Swedish rules: 80% from day 2-14)
            'sick_pay', CASE
                WHEN COALESCE(attendance_stats.sick_days, 0) > 1 THEN
                    (LEAST(COALESCE(attendance_stats.sick_days, 0) - 1, 13)) * 0.8 *
                    CASE
                        WHEN up.employment_type = 'hourly' THEN 
                            COALESCE(up.base_hourly_rate, 0) * (COALESCE(up.weekly_hours, 40) / COALESCE(CARDINALITY(up.work_days), 5))
                        ELSE 
                            COALESCE(up.base_monthly_salary, 0) / 21.75
                    END
                ELSE 0
            END,
            -- Total gross pay
            'total_gross_pay', 
                CASE
                    WHEN up.employment_type = 'salary' THEN COALESCE(up.base_monthly_salary, 0)
                    WHEN up.employment_type = 'hourly' THEN 
                        COALESCE(up.base_hourly_rate, 0) * GREATEST(
                            ROUND(COALESCE(time_stats.total_minutes, 0) / 60.0, 2),
                            COALESCE(attendance_stats.present_days, 0) * 
                                (COALESCE(up.weekly_hours, 40) / COALESCE(CARDINALITY(up.work_days), 5))
                        )
                    ELSE 0
                END +
                -- Add overtime for hourly
                CASE
                    WHEN up.employment_type = 'hourly' AND 
                         ROUND(COALESCE(time_stats.total_minutes, 0) / 60.0, 2) > (COALESCE(up.weekly_hours, 40) * 4)
                    THEN COALESCE(up.base_hourly_rate, 0) * 0.5 * 
                         GREATEST(0, ROUND(COALESCE(time_stats.total_minutes, 0) / 60.0, 2) - (COALESCE(up.weekly_hours, 40) * 4))
                    ELSE 0
                END +
                -- Add commissions
                COALESCE(commission_stats.primary_commission, 0) + 
                COALESCE(commission_stats.secondary_commission, 0),
            -- Estimated tax (simplified Swedish: ~32% municipal)
            'estimated_tax', ROUND(0.32 * (
                CASE
                    WHEN up.employment_type = 'salary' THEN COALESCE(up.base_monthly_salary, 0)
                    WHEN up.employment_type = 'hourly' THEN 
                        COALESCE(up.base_hourly_rate, 0) * GREATEST(
                            ROUND(COALESCE(time_stats.total_minutes, 0) / 60.0, 2),
                            COALESCE(attendance_stats.present_days, 0) * 
                                (COALESCE(up.weekly_hours, 40) / COALESCE(CARDINALITY(up.work_days), 5))
                        )
                    ELSE 0
                END +
                COALESCE(commission_stats.primary_commission, 0) + 
                COALESCE(commission_stats.secondary_commission, 0)
            ), 0)
        ) as employee_summary,
        up.full_name
        FROM user_profiles up
        -- Time logs aggregation
        LEFT JOIN LATERAL (
            SELECT 
                SUM(
                    EXTRACT(EPOCH FROM (tl.end_time - tl.start_time)) / 60 - COALESCE(tl.break_duration, 0)
                ) as total_minutes
            FROM time_logs tl
            WHERE tl.user_id = up.id
              AND tl.start_time >= start_date
              AND tl.start_time <= end_date
              AND tl.end_time IS NOT NULL
        ) time_stats ON true
        -- Attendance aggregation
        LEFT JOIN LATERAL (
            SELECT 
                COUNT(*) FILTER (WHERE a.status = 'present') as present_days,
                COUNT(*) FILTER (WHERE a.status = 'sick') as sick_days,
                COUNT(*) FILTER (WHERE a.status = 'vacation') as vacation_days
            FROM attendance a
            WHERE a.user_id = up.id
              AND a.date >= start_date
              AND a.date <= end_date
        ) attendance_stats ON true
        -- Commission aggregation (only invoiced orders)
        LEFT JOIN LATERAL (
            SELECT 
                COUNT(*) as order_count,
                SUM(o.value) as total_value,
                SUM(CASE 
                    WHEN o.primary_salesperson_id = up.id AND up.has_commission AND up.commission_rate IS NOT NULL
                    THEN (o.value * up.commission_rate / 100) * (1 - COALESCE(o.commission_split_percentage, 0) / 100)
                    ELSE 0
                END) as primary_commission,
                SUM(CASE 
                    WHEN o.secondary_salesperson_id = up.id AND up.has_commission AND up.commission_rate IS NOT NULL
                    THEN (o.value * up.commission_rate / 100) * (COALESCE(o.commission_split_percentage, 0) / 100)
                    ELSE 0
                END) as secondary_commission
            FROM orders o
            WHERE (o.primary_salesperson_id = up.id OR o.secondary_salesperson_id = up.id)
              AND o.status = 'fakturerad'
              AND o.updated_at >= start_date
              AND o.updated_at <= end_date
        ) commission_stats ON true
        WHERE up.organisation_id = org_id
          AND up.is_active = true
    ) employee_data;

    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_payroll_summary(uuid, date, date) TO authenticated;


-- Add helpful comments
COMMENT ON FUNCTION get_dashboard_stats(uuid) IS 
    'Returns dashboard statistics including orders total for current month, leads by status, and jobs by status';

COMMENT ON FUNCTION get_payroll_summary(uuid, date, date) IS 
    'Returns payroll summary for all active employees in an organisation for a given date range';
