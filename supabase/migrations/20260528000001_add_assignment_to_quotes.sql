-- Add assignment and city fields to the quotes table
-- Mirrors the pattern already used on leads (assigned_to_user_id, city)
-- and orders (assigned_to_user_id, assigned_to_team_id, assignment_type, region).

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_type text CHECK (assignment_type IN ('individual', 'team')),
  ADD COLUMN IF NOT EXISTS city text;

-- Indexes for efficient filtering / join lookups
CREATE INDEX IF NOT EXISTS idx_quotes_assigned_to_user_id ON quotes(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_assigned_to_team_id ON quotes(assigned_to_team_id);
