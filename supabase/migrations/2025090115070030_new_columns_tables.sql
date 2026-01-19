/*
  # Add Lead Score and Sales Tasks

  1. New Columns
    - `leads` table
      - `lead_score` (integer) - AI-generated score from 1-100
      - `last_activity_at` (timestamp) - Track last interaction
    
  2. New Tables
    - `sales_tasks`
      - `id` (uuid, primary key)
      - `organisation_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key) - assigned user
      - `title` (text) - task description
      - `description` (text, nullable) - detailed description
      - `due_date` (date, nullable) - when task is due
      - `is_completed` (boolean) - completion status
      - `created_at` (timestamp)
      - `completed_at` (timestamp, nullable)
      - 'notes' (text, nullable)
    
    - `rss_feeds`
      - `id` (uuid, primary key)
      - `organisation_id` (uuid, foreign key)
      - `name` (text) - feed name
      - `url` (text) - RSS feed URL
      - `is_active` (boolean) - whether to fetch from this feed
      - `last_fetched_at` (timestamp, nullable)
      - `created_at` (timestamp)

*/

-- Add lead_score column to leads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'lead_score'
  ) THEN
    ALTER TABLE leads ADD COLUMN lead_score integer DEFAULT 0;
  END IF;
END $$;

-- Add last_activity_at column to leads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE leads ADD COLUMN last_activity_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create sales_tasks table
CREATE TABLE IF NOT EXISTS sales_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  notes text NULL
);

-- Create rss_feeds table
CREATE TABLE IF NOT EXISTS rss_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  is_active boolean DEFAULT true,
  last_fetched_at timestamptz,
  created_at timestamptz DEFAULT now()
);


-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON leads(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_tasks_user_id ON sales_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_tasks_due_date ON sales_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_sales_tasks_completed ON sales_tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_active ON rss_feeds(is_active);

-- Add constraint for lead_score range
ALTER TABLE leads ADD CONSTRAINT check_lead_score_range CHECK (lead_score >= 0 AND lead_score <= 100);