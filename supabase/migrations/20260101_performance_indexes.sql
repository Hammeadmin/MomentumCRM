-- Performance Indexes Migration
-- Fixes Sequential Scan issues and enables fast fuzzy search

-- ============================================================================
-- Phase 1: Enable pg_trgm extension for trigram-based fuzzy search
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- Phase 2: GIN indexes for fuzzy search (supports ILIKE with leading wildcards)
-- ============================================================================

-- Customer name search (most common search target)
CREATE INDEX IF NOT EXISTS idx_customers_name_gin 
ON customers USING GIN (name gin_trgm_ops);

-- Customer email search
CREATE INDEX IF NOT EXISTS idx_customers_email_gin 
ON customers USING GIN (email gin_trgm_ops);

-- Order title search (orders table uses 'title', not 'order_number')
CREATE INDEX IF NOT EXISTS idx_orders_title_gin 
ON orders USING GIN (title gin_trgm_ops);

-- Lead title search
CREATE INDEX IF NOT EXISTS idx_leads_title_gin 
ON leads USING GIN (title gin_trgm_ops);

-- ============================================================================
-- Phase 3: B-Tree indexes for foreign keys used in RLS policies
-- These eliminate sequential scans on JOINs and WHERE clauses
-- ============================================================================

-- Order attachments -> orders FK (commonly joined in RLS)
CREATE INDEX IF NOT EXISTS idx_order_attachments_order_id 
ON order_attachments (order_id);

-- Orders -> assigned user FK (filtered in many queries)
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to_user_id 
ON orders (assigned_to_user_id);

-- Leads -> customer FK
CREATE INDEX IF NOT EXISTS idx_leads_customer_id 
ON leads (customer_id);

-- Jobs -> customer FK
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id 
ON jobs (customer_id);

-- ============================================================================
-- Phase 4: Additional high-value indexes based on common query patterns
-- ============================================================================

-- Orders organisation_id + status (composite for filtered lists)
CREATE INDEX IF NOT EXISTS idx_orders_org_status 
ON orders (organisation_id, status);

-- Leads organisation_id + status
CREATE INDEX IF NOT EXISTS idx_leads_org_status 
ON leads (organisation_id, status);

-- Customers organisation_id (for RLS and list queries)
CREATE INDEX IF NOT EXISTS idx_customers_org_id 
ON customers (organisation_id);

-- Invoices organisation_id + status
CREATE INDEX IF NOT EXISTS idx_invoices_org_status 
ON invoices (organisation_id, status);

-- Calendar events organisation_id + start_time (for date range queries)
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_start 
ON calendar_events (organisation_id, start_time);
