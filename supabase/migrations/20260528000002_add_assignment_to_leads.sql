-- Add team assignment fields to leads table
-- Mirrors the pattern already used on quotes (assigned_to_team_id, assignment_type).

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS assigned_to_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_type text CHECK (assignment_type IN ('individual', 'team'));

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to_team_id ON leads(assigned_to_team_id);
