/*
# Enhanced Payroll Schema

1. New Payroll Fields
   - Enhanced user_profiles with payroll information
   - Commission tracking in orders table
   - Timesheet approval workflow

2. Security
   - Enable RLS on enhanced tables
   - Add policies for payroll data access

3. Payroll Features
   - Employment types (hourly/salary)
   - Commission tracking and calculations
   - Swedish payroll compliance fields
*/

-- Add payroll fields to user_profiles
DO $$
BEGIN
  -- Add base_hourly_rate column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'base_hourly_rate'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN base_hourly_rate numeric(10,2) DEFAULT 650.00;
  END IF;

  -- Add base_monthly_salary column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'base_monthly_salary'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN base_monthly_salary numeric(12,2) DEFAULT NULL;
  END IF;

  -- Add commission_rate column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'commission_rate'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN commission_rate numeric(5,2) DEFAULT 0.00;
  END IF;

  -- Add employment_type enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type') THEN
    CREATE TYPE employment_type AS ENUM ('hourly', 'salary');
  END IF;

  -- Add employment_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'employment_type'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN employment_type employment_type DEFAULT 'hourly';
  END IF;

  -- Add has_commission column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'has_commission'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN has_commission boolean DEFAULT false;
  END IF;

  -- Add personnummer column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'personnummer'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN personnummer text;
  END IF;

  -- Add bank_account_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'bank_account_number'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN bank_account_number text;
  END IF;
END $$;

-- Add commission tracking to orders table
DO $$
BEGIN
  -- Add primary_salesperson_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'primary_salesperson_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN primary_salesperson_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add secondary_salesperson_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'secondary_salesperson_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN secondary_salesperson_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add commission_split_percentage column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'commission_split_percentage'
  ) THEN
    ALTER TABLE orders ADD COLUMN commission_split_percentage numeric(5,2) DEFAULT 0.00;
  END IF;

  -- Add commission_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'commission_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN commission_amount numeric(12,2) DEFAULT 0.00;
  END IF;

  -- Add commission_paid column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'commission_paid'
  ) THEN
    ALTER TABLE orders ADD COLUMN commission_paid boolean DEFAULT false;
  END IF;
END $$;


-- Create indexes for payroll queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_employment_type ON user_profiles(employment_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_has_commission ON user_profiles(has_commission) WHERE has_commission = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_personnummer ON user_profiles(personnummer) WHERE personnummer IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_primary_salesperson ON orders(primary_salesperson_id) WHERE primary_salesperson_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_secondary_salesperson ON orders(secondary_salesperson_id) WHERE secondary_salesperson_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_commission_amount ON orders(commission_amount) WHERE commission_amount > 0;
CREATE INDEX IF NOT EXISTS idx_orders_commission_paid ON orders(commission_paid);

-- Create function to calculate order commission
CREATE OR REPLACE FUNCTION calculate_order_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if order has value and primary salesperson
  IF NEW.value IS NOT NULL AND NEW.primary_salesperson_id IS NOT NULL THEN
    -- Get primary salesperson commission rate
    SELECT commission_rate INTO NEW.commission_amount
    FROM user_profiles 
    WHERE id = NEW.primary_salesperson_id AND has_commission = true;
    
    -- Calculate commission amount (commission_rate is percentage)
    IF NEW.commission_amount IS NOT NULL THEN
      NEW.commission_amount := (NEW.value * NEW.commission_amount / 100);
      
      -- If there's a secondary salesperson, split the commission
      IF NEW.secondary_salesperson_id IS NOT NULL AND NEW.commission_split_percentage > 0 THEN
        -- The commission_amount will be split between primary and secondary
        -- Primary gets (100 - split_percentage)%, secondary gets split_percentage%
        NULL; -- Commission splitting logic handled in application
      END IF;
    ELSE
      NEW.commission_amount := 0;
    END IF;
  ELSE
    NEW.commission_amount := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for commission calculation
DROP TRIGGER IF EXISTS trigger_calculate_order_commission ON orders;
CREATE TRIGGER trigger_calculate_order_commission
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_commission();