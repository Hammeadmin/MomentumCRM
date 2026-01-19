/*
  # Create jobs table

  1. New Tables
    - `jobs`
      - `id` (uuid, primary key)
      - `organisation_id` (uuid, foreign key to organisations)
      - `customer_id` (uuid, foreign key to customers)
      - `quote_id` (uuid, foreign key to quotes, nullable)
      - `assigned_to_user_id` (uuid, foreign key to user_profiles, nullable)
      - `title` (text, not null) - Job title
      - `description` (text) - Job description
      - `status` (enum: pending, in_progress, completed, invoiced)
      - `value` (decimal, not null) - Job value
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `jobs` table
    - Add policies for organisation members to manage jobs

  3. Enums
    - Create job_status enum for status field
*/

-- Create enum for job status
CREATE TYPE job_status AS ENUM ('pending', 'in_progress', 'completed', 'invoiced');

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  assigned_to_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status job_status DEFAULT 'pending',
  value decimal(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Organisation members can read jobs
CREATE POLICY "Organisation members can read jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Admins can manage all jobs
CREATE POLICY "Admins can manage jobs"
  ON jobs
  FOR ALL
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id 
      FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update jobs assigned to them
CREATE POLICY "Users can update assigned jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (assigned_to_user_id = auth.uid());