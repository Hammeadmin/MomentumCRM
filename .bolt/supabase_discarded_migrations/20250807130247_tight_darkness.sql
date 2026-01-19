/*
  # Complete Momentum CRM Database Schema

  1. Extensions and Types
    - Enable UUID extension
    - Create all ENUM types for status fields
  
  2. Core Tables
    - `organisations` - Company/organization data
    - `user_profiles` - Extended user profiles linked to auth.users
    - `customers` - Customer registry
    - `leads` - Sales prospects and opportunities
    - `quotes` - Price quotes and proposals
    - `jobs` - Work assignments and projects
    - `invoices` - Billing and payment tracking
    - `calendar_events` - Meetings, tasks, and reminders
  
  3. Security
    - Enable RLS on all tables
    - Create organization-based access policies
    - Ensure data isolation between organizations
  
  4. Performance
    - Add indexes for common queries
    - Optimize foreign key relationships
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types for status fields
CREATE TYPE user_role AS ENUM ('admin', 'sales', 'worker');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'won', 'lost');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'declined');
CREATE TYPE job_status AS ENUM ('pending', 'in_progress', 'completed', 'invoiced');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');
CREATE TYPE event_type AS ENUM ('meeting', 'task', 'reminder');

-- Create organisations table
CREATE TABLE IF NOT EXISTS organisations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    org_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    role user_role NOT NULL DEFAULT 'worker',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone_number TEXT,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    assigned_to_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT,
    status lead_status NOT NULL DEFAULT 'new',
    estimated_value DECIMAL(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    total_amount DECIMAL(12,2) NOT NULL,
    status quote_status NOT NULL DEFAULT 'draft',
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    assigned_to_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status job_status NOT NULL DEFAULT 'pending',
    value DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    status invoice_status NOT NULL DEFAULT 'draft',
    due_date DATE,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    assigned_to_user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type event_type NOT NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    related_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organisation-based access

-- Organisations policies
CREATE POLICY "Users can access their organisation" ON organisations
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE organisation_id = organisations.id
  )
);

-- User profiles policies
CREATE POLICY "Users can access their own profile" ON user_profiles
FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can view org members" ON user_profiles
FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM user_profiles up WHERE up.organisation_id = user_profiles.organisation_id
  )
);

-- Customers policies
CREATE POLICY "Users can access their organisation's customers" ON customers
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE organisation_id = customers.organisation_id
  )
);

-- Leads policies
CREATE POLICY "Users can access their organisation's leads" ON leads
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE organisation_id = leads.organisation_id
  )
);

-- Quotes policies
CREATE POLICY "Users can access their organisation's quotes" ON quotes
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE organisation_id = quotes.organisation_id
  )
);

-- Jobs policies
CREATE POLICY "Users can access their organisation's jobs" ON jobs
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE organisation_id = jobs.organisation_id
  )
);

-- Invoices policies
CREATE POLICY "Users can access their organisation's invoices" ON invoices
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE organisation_id = invoices.organisation_id
  )
);

-- Calendar events policies
CREATE POLICY "Users can access their organisation's events" ON calendar_events
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE organisation_id = calendar_events.organisation_id
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_organisation_id ON user_profiles(organisation_id);
CREATE INDEX IF NOT EXISTS idx_customers_organisation_id ON customers(organisation_id);
CREATE INDEX IF NOT EXISTS idx_leads_organisation_id ON leads(organisation_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_organisation_id ON quotes(organisation_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_jobs_organisation_id ON jobs(organisation_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON jobs(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_organisation_id ON invoices(organisation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organisation_id ON calendar_events(organisation_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_assigned_to ON calendar_events(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);

-- Add unique constraints
ALTER TABLE invoices ADD CONSTRAINT unique_invoice_number_per_org 
UNIQUE (organisation_id, invoice_number);

-- Add check constraints for data validation
ALTER TABLE leads ADD CONSTRAINT check_estimated_value_positive 
CHECK (estimated_value IS NULL OR estimated_value >= 0);

ALTER TABLE quotes ADD CONSTRAINT check_total_amount_positive 
CHECK (total_amount >= 0);

ALTER TABLE jobs ADD CONSTRAINT check_value_positive 
CHECK (value >= 0);

ALTER TABLE invoices ADD CONSTRAINT check_amount_positive 
CHECK (amount >= 0);

ALTER TABLE calendar_events ADD CONSTRAINT check_event_times 
CHECK (start_time IS NULL OR end_time IS NULL OR start_time <= end_time);