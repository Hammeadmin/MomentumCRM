/*
  # Create invoices table

  1. New Tables
    - `invoices`
      - `id` (uuid, primary key)
      - `organisation_id` (uuid, foreign key to organisations)
      - `job_id` (uuid, foreign key to jobs, not null)
      - `customer_id` (uuid, foreign key to customers, not null)
      - `invoice_number` (text, not null) - Sequential invoice number
      - `status` (enum: draft, sent, paid, overdue)
      - `due_date` (date) - Payment due date
      - `amount` (decimal, not null) - Invoice amount
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `invoices` table
    - Add policies for organisation members to manage invoices

  3. Enums
    - Create invoice_status enum for status field
*/

-- Create enum for invoice status
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE NOT NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  invoice_number text NOT NULL,
  status invoice_status DEFAULT 'draft',
  due_date date,
  amount decimal(12,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organisation_id, invoice_number)
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Organisation members can read invoices
CREATE POLICY "Organisation members can read invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Sales and admins can manage invoices
CREATE POLICY "Sales and admins can manage invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id 
      FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'sales')
    )
  );