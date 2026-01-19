/*
  # Create calendar events table

  1. New Tables
    - `calendar_events`
      - `id` (uuid, primary key)
      - `organisation_id` (uuid, foreign key to organisations)
      - `assigned_to_user_id` (uuid, foreign key to user_profiles, not null)
      - `title` (text, not null) - Event title
      - `type` (enum: meeting, task, reminder)
      - `start_time` (timestamptz) - Event start time
      - `end_time` (timestamptz) - Event end time
      - `related_lead_id` (uuid, foreign key to leads, nullable)
      - `related_job_id` (uuid, foreign key to jobs, nullable)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `calendar_events` table
    - Add policies for organisation members to manage calendar events

  3. Enums
    - Create event_type enum for type field
*/

-- Create enum for event type
CREATE TYPE event_type AS ENUM ('meeting', 'task', 'reminder');

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE NOT NULL,
  assigned_to_user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  type event_type DEFAULT 'meeting',
  start_time timestamptz,
  end_time timestamptz,
  related_lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  related_job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can read events assigned to them
CREATE POLICY "Users can read assigned events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (assigned_to_user_id = auth.uid());

-- Organisation members can read all events
CREATE POLICY "Organisation members can read events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Users can manage their own events
CREATE POLICY "Users can manage own events"
  ON calendar_events
  FOR ALL
  TO authenticated
  USING (assigned_to_user_id = auth.uid());

-- Admins can manage all organisation events
CREATE POLICY "Admins can manage organisation events"
  ON calendar_events
  FOR ALL
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id 
      FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );