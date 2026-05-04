-- Add created_by_user_id to quotes table
-- Nullable so existing rows are unaffected.
-- References user_profiles (not auth.users) to allow Supabase select joins.

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Index for fast look-ups by creator (e.g. "quotes I created")
CREATE INDEX IF NOT EXISTS idx_quotes_created_by_user_id
  ON quotes (created_by_user_id)
  WHERE created_by_user_id IS NOT NULL;
