/*
  # Create Message Templates Table

  1. New Tables
    - `message_templates`
      - `id` (uuid, primary key)
      - `organisation_id` (uuid, foreign key to organisations)
      - `name` (text) - template name for display
      - `channel` (text) - 'email' or 'sms'
      - `type` (text) - 'quote', 'invoice', 'reminder', 'booking_confirmation', 'follow_up', 'welcome', 'general'
      - `subject` (text, nullable) - email subject line (only for email templates)
      - `content` (text) - template body with placeholder variables
      - `variables` (jsonb) - array of available variables for this template
      - `is_default` (boolean) - whether this is a default system template
      - `is_active` (boolean) - whether the template is active
      - `created_by` (uuid, foreign key to user_profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `message_templates` table
    - Add policy for organisation members to read their templates
    - Add policy for admin/sales to create/update/delete templates

  3. Default Templates
    - Insert default email and SMS templates for common use cases
*/

-- Create message_templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms')),
  type text NOT NULL CHECK (type IN ('quote', 'invoice', 'reminder', 'booking_confirmation', 'follow_up', 'welcome', 'general')),
  subject text,
  content text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_message_templates_org_channel ON message_templates(organisation_id, channel);
CREATE INDEX IF NOT EXISTS idx_message_templates_org_type ON message_templates(organisation_id, type);

-- Enable RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view templates from their organisation
CREATE POLICY "Users can view organisation templates"
  ON message_templates
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Admin and sales can insert templates
CREATE POLICY "Admin and sales can create templates"
  ON message_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'sales')
    )
  );

-- Policy: Admin and sales can update templates
CREATE POLICY "Admin and sales can update templates"
  ON message_templates
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'sales')
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'sales')
    )
  );

-- Policy: Admin and sales can delete templates (only non-default)
CREATE POLICY "Admin and sales can delete non-default templates"
  ON message_templates
  FOR DELETE
  TO authenticated
  USING (
    is_default = false AND
    organisation_id IN (
      SELECT organisation_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'sales')
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_message_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS message_templates_updated_at ON message_templates;
CREATE TRIGGER message_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_message_templates_updated_at();

-- Insert default templates for each organisation
INSERT INTO message_templates (organisation_id, name, channel, type, subject, content, variables, is_default, is_active)
SELECT 
  o.id,
  'Offert skickad',
  'email',
  'quote',
  'Offert #{quote_number} från {company_name}',
  'Hej {customer_name},

Tack för ditt intresse! Bifogat finner du vår offert #{quote_number}.

Offertens totala belopp: {amount} kr (inkl. moms)

Offerten är giltig till och med {valid_until}.

Har du några frågor är du välkommen att kontakta oss.

Med vänliga hälsningar,
{company_name}
{company_phone}
{company_email}',
  '["customer_name", "quote_number", "amount", "valid_until", "company_name", "company_phone", "company_email"]'::jsonb,
  true,
  true
FROM organisations o
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates mt 
  WHERE mt.organisation_id = o.id AND mt.channel = 'email' AND mt.type = 'quote' AND mt.is_default = true
);

-- Default invoice email template
INSERT INTO message_templates (organisation_id, name, channel, type, subject, content, variables, is_default, is_active)
SELECT 
  o.id,
  'Faktura skickad',
  'email',
  'invoice',
  'Faktura #{invoice_number} från {company_name}',
  'Hej {customer_name},

Bifogat finner du faktura #{invoice_number} för utfört arbete.

Fakturabelopp: {amount} kr (inkl. moms)
Betalningsvillkor: {payment_terms} dagar
Förfallodatum: {due_date}

Bankgiro: {bank_account}
OCR/Referens: {invoice_number}

Med vänliga hälsningar,
{company_name}',
  '["customer_name", "invoice_number", "amount", "payment_terms", "due_date", "bank_account", "company_name"]'::jsonb,
  true,
  true
FROM organisations o
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates mt 
  WHERE mt.organisation_id = o.id AND mt.channel = 'email' AND mt.type = 'invoice' AND mt.is_default = true
);

-- Default payment reminder email template
INSERT INTO message_templates (organisation_id, name, channel, type, subject, content, variables, is_default, is_active)
SELECT 
  o.id,
  'Betalningspåminnelse',
  'email',
  'reminder',
  'Påminnelse: Faktura #{invoice_number} förfaller snart',
  'Hej {customer_name},

Detta är en vänlig påminnelse om att faktura #{invoice_number} förfaller {due_date}.

Fakturabelopp: {amount} kr

Om du redan har betalat kan du bortse från detta meddelande.

Med vänliga hälsningar,
{company_name}',
  '["customer_name", "invoice_number", "amount", "due_date", "company_name"]'::jsonb,
  true,
  true
FROM organisations o
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates mt 
  WHERE mt.organisation_id = o.id AND mt.channel = 'email' AND mt.type = 'reminder' AND mt.is_default = true
);

-- Default booking confirmation email
INSERT INTO message_templates (organisation_id, name, channel, type, subject, content, variables, is_default, is_active)
SELECT 
  o.id,
  'Bokningsbekräftelse',
  'email',
  'booking_confirmation',
  'Bokningsbekräftelse - {booking_date}',
  'Hej {customer_name},

Vi bekräftar härmed din bokning.

Datum: {booking_date}
Tid: {booking_time}
Adress: {address}

Kontaktperson: {assigned_worker}
Telefon: {worker_phone}

Har du några frågor eller behöver ändra bokningen, kontakta oss på {company_phone}.

Med vänliga hälsningar,
{company_name}',
  '["customer_name", "booking_date", "booking_time", "address", "assigned_worker", "worker_phone", "company_name", "company_phone"]'::jsonb,
  true,
  true
FROM organisations o
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates mt 
  WHERE mt.organisation_id = o.id AND mt.channel = 'email' AND mt.type = 'booking_confirmation' AND mt.is_default = true
);

-- Default SMS templates
-- SMS: Quote sent
INSERT INTO message_templates (organisation_id, name, channel, type, content, variables, is_default, is_active)
SELECT 
  o.id,
  'Offert skickad (SMS)',
  'sms',
  'quote',
  'Hej {customer_name}! Din offert #{quote_number} på {amount} kr finns nu i din inbox. Giltig t.o.m. {valid_until}. Mvh {company_name}',
  '["customer_name", "quote_number", "amount", "valid_until", "company_name"]'::jsonb,
  true,
  true
FROM organisations o
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates mt 
  WHERE mt.organisation_id = o.id AND mt.channel = 'sms' AND mt.type = 'quote' AND mt.is_default = true
);

-- SMS: Invoice sent
INSERT INTO message_templates (organisation_id, name, channel, type, content, variables, is_default, is_active)
SELECT 
  o.id,
  'Faktura skickad (SMS)',
  'sms',
  'invoice',
  'Hej {customer_name}! Faktura #{invoice_number} på {amount} kr har skickats. Förfaller {due_date}. Mvh {company_name}',
  '["customer_name", "invoice_number", "amount", "due_date", "company_name"]'::jsonb,
  true,
  true
FROM organisations o
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates mt 
  WHERE mt.organisation_id = o.id AND mt.channel = 'sms' AND mt.type = 'invoice' AND mt.is_default = true
);

-- SMS: Payment reminder
INSERT INTO message_templates (organisation_id, name, channel, type, content, variables, is_default, is_active)
SELECT 
  o.id,
  'Betalningspåminnelse (SMS)',
  'sms',
  'reminder',
  'Påminnelse: Faktura #{invoice_number} på {amount} kr förfaller {due_date}. Mvh {company_name}',
  '["invoice_number", "amount", "due_date", "company_name"]'::jsonb,
  true,
  true
FROM organisations o
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates mt 
  WHERE mt.organisation_id = o.id AND mt.channel = 'sms' AND mt.type = 'reminder' AND mt.is_default = true
);

-- SMS: Booking confirmation
INSERT INTO message_templates (organisation_id, name, channel, type, content, variables, is_default, is_active)
SELECT 
  o.id,
  'Bokningsbekräftelse (SMS)',
  'sms',
  'booking_confirmation',
  'Hej {customer_name}! Din bokning är bekräftad för {booking_date} kl {booking_time}. Vi hörs! Mvh {company_name}',
  '["customer_name", "booking_date", "booking_time", "company_name"]'::jsonb,
  true,
  true
FROM organisations o
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates mt 
  WHERE mt.organisation_id = o.id AND mt.channel = 'sms' AND mt.type = 'booking_confirmation' AND mt.is_default = true
);

-- SMS: Booking reminder (day before)
INSERT INTO message_templates (organisation_id, name, channel, type, content, variables, is_default, is_active)
SELECT 
  o.id,
  'Bokningspåminnelse (SMS)',
  'sms',
  'follow_up',
  'Hej {customer_name}! Påminnelse om din bokning imorgon {booking_date} kl {booking_time}. Adress: {address}. Mvh {company_name}',
  '["customer_name", "booking_date", "booking_time", "address", "company_name"]'::jsonb,
  true,
  true
FROM organisations o
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates mt 
  WHERE mt.organisation_id = o.id AND mt.channel = 'sms' AND mt.type = 'follow_up' AND mt.is_default = true
);

-- SMS: On the way
INSERT INTO message_templates (organisation_id, name, channel, type, content, variables, is_default, is_active)
SELECT 
  o.id,
  'Vi är på väg (SMS)',
  'sms',
  'general',
  'Hej {customer_name}! {assigned_worker} är nu på väg till dig och beräknas vara framme om ca {eta_minutes} min. Mvh {company_name}',
  '["customer_name", "assigned_worker", "eta_minutes", "company_name"]'::jsonb,
  true,
  true
FROM organisations o
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates mt 
  WHERE mt.organisation_id = o.id AND mt.channel = 'sms' AND mt.type = 'general' AND mt.name = 'Vi är på väg (SMS)'
);
