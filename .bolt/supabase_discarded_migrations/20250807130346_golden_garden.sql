/*
  # Insert Swedish Demo Data for Momentum CRM

  1. Demo Organizations
    - Create sample Swedish companies
  
  2. Demo Users
    - Create sample user profiles with different roles
  
  3. Demo Customers
    - Swedish companies with proper addresses and contact info
  
  4. Demo Leads, Quotes, Jobs, Invoices
    - Realistic Swedish business data
  
  5. Demo Calendar Events
    - Sample meetings and tasks
*/

-- Insert demo organisations
INSERT INTO organisations (id, name, org_number) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'TechConsult Stockholm AB', '556789-1234'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Nordic Solutions Group', '559876-5432');

-- Insert demo customers for TechConsult Stockholm AB
INSERT INTO customers (id, organisation_id, name, email, phone_number, address, postal_code, city) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Volvo Cars AB', 'kontakt@volvocars.se', '+46 31 59 00 00', 'Götaverksgatan 10', '40531', 'Göteborg'),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'IKEA Sverige AB', 'info@ikea.se', '+46 476 81 00 00', 'Älmhultsgatan 1', '34381', 'Älmhult'),
  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Spotify Technology SA', 'business@spotify.com', '+46 8 120 000 00', 'Regeringsgatan 19', '11153', 'Stockholm'),
  ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Ericsson AB', 'info@ericsson.com', '+46 10 719 00 00', 'Torshamnsgatan 21', '16440', 'Kista'),
  ('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'H&M Hennes & Mauritz AB', 'info@hm.com', '+46 8 796 55 00', 'Mäster Samuelsgatan 46', '10638', 'Stockholm');

-- Insert demo leads for TechConsult Stockholm AB
INSERT INTO leads (id, organisation_id, customer_id, title, description, source, status, estimated_value) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'Digital Transformation Project', 'Modernisering av IT-infrastruktur och digitala processer', 'Webbformulär', 'qualified', 2500000.00),
  ('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', 'E-commerce Platform Upgrade', 'Uppgradering av e-handelsplattform för bättre prestanda', 'Referral', 'contacted', 1800000.00),
  ('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003', 'Cloud Migration Services', 'Migration av befintliga system till molnlösningar', 'LinkedIn', 'new', 3200000.00),
  ('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440004', 'Mobile App Development', 'Utveckling av intern mobilapplikation för medarbetare', 'Google Ads', 'qualified', 950000.00),
  ('770e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440005', 'Data Analytics Solution', 'Implementation av avancerad dataanalys och rapportering', 'Webbformulär', 'won', 1650000.00);

-- Insert demo quotes for TechConsult Stockholm AB
INSERT INTO quotes (id, organisation_id, customer_id, lead_id, title, description, total_amount, status, valid_until) VALUES
  ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Offert - Digital Transformation', 'Komplett digitalisering av affärsprocesser inkl. systemintegration', 2500000.00, 'sent', '2024-03-15'),
  ('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440004', 'Offert - Mobilapp Utveckling', 'Utveckling av iOS och Android app med backend-integration', 950000.00, 'accepted', '2024-02-28'),
  ('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440005', 'Offert - Data Analytics', 'Business Intelligence lösning med dashboards och rapporter', 1650000.00, 'accepted', '2024-01-31');

-- Insert demo jobs for TechConsult Stockholm AB
INSERT INTO jobs (id, organisation_id, customer_id, quote_id, title, description, status, value) VALUES
  ('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440002', 'Mobilapp Utveckling - Ericsson', 'Utveckling av intern mobilapp för Ericsson medarbetare', 'in_progress', 950000.00),
  ('990e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440005', '880e8400-e29b-41d4-a716-446655440003', 'Data Analytics - H&M', 'Implementation av BI-lösning för H&M', 'completed', 1650000.00),
  ('990e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', NULL, 'Konsultuppdrag - Volvo', 'IT-rådgivning för digitalisering av produktionsprocesser', 'pending', 750000.00);

-- Insert demo invoices for TechConsult Stockholm AB
INSERT INTO invoices (id, organisation_id, job_id, customer_id, invoice_number, status, due_date, amount) VALUES
  ('aa0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440005', 'F-2024-001', 'paid', '2024-02-15', 1650000.00),
  ('aa0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440004', 'F-2024-002', 'sent', '2024-03-01', 475000.00),
  ('aa0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', 'F-2024-003', 'draft', '2024-03-15', 375000.00);