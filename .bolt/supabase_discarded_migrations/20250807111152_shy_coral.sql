/*
  # Insert Swedish demo data for testing

  1. Demo Data
    - Sample Swedish organisation
    - Demo user profiles with Swedish names
    - Swedish customers with realistic data
    - Sample leads, quotes, jobs, invoices
    - Calendar events in Swedish

  2. Notes
    - All data uses Swedish terminology and formatting
    - Realistic Swedish company names and addresses
    - Swedish phone numbers and postal codes
    - Swedish currency formatting (SEK)
*/

-- Insert demo organisation
INSERT INTO organisations (id, name, org_number, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'TechLösningar Stockholm AB', '556123-4567', now());

-- Insert demo user profiles (these will need to be created after users sign up)
-- This is just for reference - actual user profiles are created when users register

-- Insert demo customers
INSERT INTO customers (organisation_id, name, email, phone_number, address, postal_code, city, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Acme Corporation AB', 'info@acme.se', '+46 8 123 456 78', 'Storgatan 15', '11122', 'Stockholm', now() - interval '30 days'),
  ('550e8400-e29b-41d4-a716-446655440000', 'TechStart Solutions', 'kontakt@techstart.se', '+46 31 789 012 34', 'Avenyn 42', '41135', 'Göteborg', now() - interval '25 days'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Nordic Innovations AB', 'hej@nordic.se', '+46 40 345 678 90', 'Malmövägen 8', '21145', 'Malmö', now() - interval '20 days'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Innovation Labs Sweden', 'hello@labs.se', '+46 11 901 234 56', 'Teknikgatan 3', '58330', 'Linköping', now() - interval '15 days'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Startup Ventures Nordic', 'info@startup.se', '+46 18 567 890 12', 'Universitetsgatan 12', '75236', 'Uppsala', now() - interval '10 days');

-- Insert demo leads
INSERT INTO leads (organisation_id, customer_id, title, description, source, status, estimated_value, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM customers WHERE name = 'Acme Corporation AB'), 'Ny webbplats och e-handel', 'Acme behöver en modern webbplats med integrerad e-handelslösning', 'Webbformulär', 'new', 150000.00, now() - interval '5 days'),
  ('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM customers WHERE name = 'TechStart Solutions'), 'CRM-systemintegration', 'Integration av befintligt CRM med nya verktyg', 'Referral', 'contacted', 75000.00, now() - interval '8 days'),
  ('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM customers WHERE name = 'Nordic Innovations AB'), 'Mobilappsutveckling', 'Utveckling av iOS och Android app för kundservice', 'LinkedIn', 'qualified', 300000.00, now() - interval '12 days'),
  ('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM customers WHERE name = 'Innovation Labs Sweden'), 'IT-konsulttjänster', 'Löpande IT-support och konsultation', 'Google Ads', 'new', 50000.00, now() - interval '3 days');

-- Insert demo quotes
INSERT INTO quotes (organisation_id, customer_id, lead_id, title, description, total_amount, status, valid_until, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 
   (SELECT id FROM customers WHERE name = 'Nordic Innovations AB'),
   (SELECT id FROM leads WHERE title = 'Mobilappsutveckling'),
   'Offert - Mobilappsutveckling Nordic Innovations', 
   'Utveckling av iOS och Android app med backend-integration', 
   300000.00, 
   'sent', 
   current_date + interval '30 days', 
   now() - interval '5 days'),
  ('550e8400-e29b-41d4-a716-446655440000', 
   (SELECT id FROM customers WHERE name = 'TechStart Solutions'),
   (SELECT id FROM leads WHERE title = 'CRM-systemintegration'),
   'Offert - CRM Integration TechStart', 
   'Integration och anpassning av CRM-system', 
   75000.00, 
   'accepted', 
   current_date + interval '15 days', 
   now() - interval '10 days');

-- Insert demo jobs
INSERT INTO jobs (organisation_id, customer_id, quote_id, title, description, status, value, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 
   (SELECT id FROM customers WHERE name = 'TechStart Solutions'),
   (SELECT id FROM quotes WHERE title = 'Offert - CRM Integration TechStart'),
   'CRM Integration - TechStart Solutions', 
   'Implementation av CRM-integration enligt accepterad offert', 
   'in_progress', 
   75000.00, 
   now() - interval '7 days');

-- Insert demo invoices
INSERT INTO invoices (organisation_id, job_id, customer_id, invoice_number, status, due_date, amount, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 
   (SELECT id FROM jobs WHERE title = 'CRM Integration - TechStart Solutions'),
   (SELECT id FROM customers WHERE name = 'TechStart Solutions'),
   'F-2024-001', 
   'sent', 
   current_date + interval '30 days', 
   75000.00, 
   now() - interval '2 days');

-- Note: Calendar events and user assignments will be added after user profiles are created
-- This requires actual authenticated users to exist first