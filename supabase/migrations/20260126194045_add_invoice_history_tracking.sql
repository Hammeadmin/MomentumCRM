/*
  # Add Invoice History Tracking
  
  1. New Tables
    - `invoice_history`
      - `id` (uuid, primary key)
      - `organisation_id` (uuid, foreign key to organisations)
      - `invoice_id` (uuid, foreign key to invoices)
      - `action_type` (text) - Type of action: 'created', 'sent', 'reminder_sent', 'viewed', 'paid', 'status_changed', 'updated', 'duplicated'
      - `performed_by_user_id` (uuid, foreign key to user_profiles) - Who performed the action
      - `details` (jsonb) - Additional details about the action (recipient email, previous/new status, etc.)
      - `created_at` (timestamptz)
  
  2. Table Modifications
    - Add `sent_count` to invoices to track how many times an invoice has been sent
    - Add `last_sent_at` to invoices
    - Add `reminder_count` to invoices
    - Add `last_reminder_at` to invoices
    - Add `viewed_at` to invoices for when customer views the invoice
  
  3. Security
    - Enable RLS on `invoice_history`
    - Add policies for authenticated users to view/create history for their organisation
*/

-- Create invoice_history table
CREATE TABLE IF NOT EXISTS invoice_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  performed_by_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_invoice_history_invoice_id ON invoice_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_organisation_id ON invoice_history(organisation_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_created_at ON invoice_history(created_at DESC);

-- Add new columns to invoices table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'sent_count') THEN
    ALTER TABLE invoices ADD COLUMN sent_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'last_sent_at') THEN
    ALTER TABLE invoices ADD COLUMN last_sent_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'reminder_count') THEN
    ALTER TABLE invoices ADD COLUMN reminder_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'last_reminder_at') THEN
    ALTER TABLE invoices ADD COLUMN last_reminder_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'viewed_at') THEN
    ALTER TABLE invoices ADD COLUMN viewed_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'sent_by_user_id') THEN
    ALTER TABLE invoices ADD COLUMN sent_by_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS on invoice_history
ALTER TABLE invoice_history ENABLE ROW LEVEL SECURITY;

-- Policy for users to view history within their organisation
CREATE POLICY "Users can view invoice history in their organisation"
  ON invoice_history FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy for users to create history entries
CREATE POLICY "Users can create invoice history in their organisation"
  ON invoice_history FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Function to automatically create history entry when invoice is created
CREATE OR REPLACE FUNCTION create_invoice_history_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO invoice_history (organisation_id, invoice_id, action_type, performed_by_user_id, details)
  VALUES (
    NEW.organisation_id,
    NEW.id,
    'created',
    NEW.created_by_user_id,
    jsonb_build_object('invoice_number', NEW.invoice_number, 'amount', NEW.amount)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for invoice creation
DROP TRIGGER IF EXISTS invoice_history_insert_trigger ON invoices;
CREATE TRIGGER invoice_history_insert_trigger
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION create_invoice_history_on_insert();

-- Function to automatically create history entry when invoice status changes
CREATE OR REPLACE FUNCTION create_invoice_history_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO invoice_history (organisation_id, invoice_id, action_type, performed_by_user_id, details)
    VALUES (
      NEW.organisation_id,
      NEW.id,
      CASE NEW.status
        WHEN 'paid' THEN 'paid'
        ELSE 'status_changed'
      END,
      NEW.sent_by_user_id,
      jsonb_build_object('previous_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  
  -- Track email sends
  IF OLD.email_sent IS DISTINCT FROM NEW.email_sent AND NEW.email_sent = true THEN
    UPDATE invoices SET 
      sent_count = COALESCE(sent_count, 0) + 1,
      last_sent_at = now()
    WHERE id = NEW.id;
    
    INSERT INTO invoice_history (organisation_id, invoice_id, action_type, performed_by_user_id, details)
    VALUES (
      NEW.organisation_id,
      NEW.id,
      'sent',
      NEW.sent_by_user_id,
      jsonb_build_object('recipient', NEW.email_recipient, 'sent_at', NEW.email_sent_at)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for invoice status changes
DROP TRIGGER IF EXISTS invoice_history_update_trigger ON invoices;
CREATE TRIGGER invoice_history_update_trigger
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION create_invoice_history_on_status_change();
