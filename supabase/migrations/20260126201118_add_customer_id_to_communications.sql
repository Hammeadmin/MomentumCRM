/*
  # Add customer_id column to communications table

  1. Changes
    - Add `customer_id` column to `communications` table
    - This allows communications to be linked directly to customers
      without requiring an order

  2. Security
    - Column is optional (nullable) to maintain backward compatibility
    - Foreign key constraint to customers table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communications' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE communications ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_communications_customer_id ON communications(customer_id);
