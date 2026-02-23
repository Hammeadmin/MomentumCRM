-- Fix missing column that causes trigger error
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
