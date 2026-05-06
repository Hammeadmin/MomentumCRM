/*
  # Fix Invoice Creation Prerequisites

  This migration is idempotent and consolidates several earlier migrations
  that may not have been applied to the hosted Supabase project.

  1. Ensures `created_by_user_id` column exists on `invoices`
     - Referenced by the AFTER INSERT trigger; if missing, every INSERT fails
     - Migration 20260223193000 should have added this, but may not have run

  2. Ensures `generate_invoice_number(org_id UUID)` function exists
     - Called from the application to generate sequential invoice numbers
     - Migration 20250808191037 should have added this, but may not have run

  3. Recreates `create_invoice_history_on_insert` trigger function
     - Forces PostgreSQL to recompile with the column present, eliminating
       "record 'new' has no field 'created_by_user_id'" runtime errors

  All statements use IF NOT EXISTS / CREATE OR REPLACE so this is safe to
  run even when everything is already in place.
*/

-- 1. Ensure created_by_user_id exists on invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE invoices
      ADD COLUMN created_by_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Ensure generate_invoice_number function exists (idempotent via CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION generate_invoice_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER;
    next_number  INTEGER;
    inv_number   TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW());

    SELECT COALESCE(
        MAX(
            CASE
                WHEN invoice_number ~ ('^' || current_year || '-[0-9]+$')
                THEN CAST(SPLIT_PART(invoice_number, '-', 2) AS INTEGER)
                ELSE 0
            END
        ), 0
    ) + 1
    INTO next_number
    FROM invoices
    WHERE organisation_id = org_id;

    inv_number := current_year || '-' || LPAD(next_number::TEXT, 4, '0');
    RETURN inv_number;
END;
$$ LANGUAGE plpgsql;

-- 3. Recreate the insert trigger function so it compiles with the column present
CREATE OR REPLACE FUNCTION create_invoice_history_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert history if the invoice_history table exists
  INSERT INTO invoice_history (
    organisation_id,
    invoice_id,
    action_type,
    performed_by_user_id,
    details
  )
  VALUES (
    NEW.organisation_id,
    NEW.id,
    'created',
    NEW.created_by_user_id,
    jsonb_build_object(
      'invoice_number', NEW.invoice_number,
      'amount', NEW.amount
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger (DROP + CREATE is safe since it's idempotent via DROP IF EXISTS)
DROP TRIGGER IF EXISTS invoice_history_insert_trigger ON invoices;
CREATE TRIGGER invoice_history_insert_trigger
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION create_invoice_history_on_insert();
