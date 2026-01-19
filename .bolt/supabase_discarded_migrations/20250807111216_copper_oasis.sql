/*
  # Create database indexes and additional constraints

  1. Performance Indexes
    - Add indexes for frequently queried columns
    - Composite indexes for common query patterns
    - Foreign key indexes for join performance

  2. Additional Constraints
    - Check constraints for data validation
    - Unique constraints where needed

  3. Functions and Triggers
    - Auto-update functions for common patterns
*/

-- Performance indexes for organisations
CREATE INDEX IF NOT EXISTS idx_organisations_created_at ON organisations(created_at);

-- Performance indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_organisation_id ON user_profiles(organisation_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

-- Performance indexes for customers
CREATE INDEX IF NOT EXISTS idx_customers_organisation_id ON customers(organisation_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Performance indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_organisation_id ON leads(organisation_id);
CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to_user_id ON leads(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- Performance indexes for quotes
CREATE INDEX IF NOT EXISTS idx_quotes_organisation_id ON quotes(organisation_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_lead_id ON quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);

-- Performance indexes for jobs
CREATE INDEX IF NOT EXISTS idx_jobs_organisation_id ON jobs(organisation_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_quote_id ON jobs(quote_id);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to_user_id ON jobs(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

-- Performance indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_organisation_id ON invoices(organisation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);

-- Performance indexes for calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_organisation_id ON calendar_events(organisation_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_assigned_to_user_id ON calendar_events(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_related_lead_id ON calendar_events(related_lead_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_related_job_id ON calendar_events(related_job_id);

-- Add check constraints for data validation
ALTER TABLE leads ADD CONSTRAINT check_estimated_value_positive 
  CHECK (estimated_value IS NULL OR estimated_value >= 0);

ALTER TABLE quotes ADD CONSTRAINT check_total_amount_positive 
  CHECK (total_amount > 0);

ALTER TABLE jobs ADD CONSTRAINT check_value_positive 
  CHECK (value > 0);

ALTER TABLE invoices ADD CONSTRAINT check_amount_positive 
  CHECK (amount > 0);

ALTER TABLE calendar_events ADD CONSTRAINT check_end_time_after_start 
  CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time);

-- Add constraint for Swedish postal codes (5 digits)
ALTER TABLE customers ADD CONSTRAINT check_postal_code_format 
  CHECK (postal_code IS NULL OR postal_code ~ '^\d{5}$');

-- Add constraint for Swedish organisation numbers (format: XXXXXX-XXXX)
ALTER TABLE organisations ADD CONSTRAINT check_org_number_format 
  CHECK (org_number IS NULL OR org_number ~ '^\d{6}-\d{4}$');