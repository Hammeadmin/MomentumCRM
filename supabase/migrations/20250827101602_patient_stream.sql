/*
# Document Management System

1. New Tables
   - `documents`
     - `id` (uuid, primary key)
     - `organisation_id` (uuid, foreign key)
     - `filename` (text)
     - `file_path` (text)
     - `category` (text)
     - `description` (text)
     - `uploaded_by_user_id` (uuid, foreign key)
     - `view_permissions` (jsonb array of roles)
     - `is_active` (boolean)
     - `created_at` (timestamp)

2. Security
   - Enable RLS on `documents` table
   - Add policies for role-based access control
   - File upload permissions based on user role

3. Features
   - Document categorization
   - Role-based visibility
   - Upload tracking and audit trail
*/

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size bigint DEFAULT 0,
  file_type text,
  category text NOT NULL CHECK (category IN ('Policys', 'Mallar', 'Utbildning', 'Rutiner', 'Övrigt')),
  description text,
  uploaded_by_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  view_permissions jsonb DEFAULT '["admin", "sales", "worker"]'::jsonb,
  download_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_organisation_id ON documents(organisation_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_documents_active ON documents(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view documents based on permissions"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = documents.organisation_id
      AND up.id = auth.uid()
      AND up.role::text = ANY(
        SELECT jsonb_array_elements_text(view_permissions)
      )
    )
  );

CREATE POLICY "Users can upload documents for their organization"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = documents.organisation_id
      AND up.id = auth.uid()
      AND documents.uploaded_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own documents or admins can update any"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = documents.organisation_id
      AND up.id = auth.uid()
      AND (
        documents.uploaded_by_user_id = auth.uid()
        OR up.role = 'admin'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = documents.organisation_id
      AND up.id = auth.uid()
      AND (
        documents.uploaded_by_user_id = auth.uid()
        OR up.role = 'admin'
      )
    )
  );

CREATE POLICY "Admins can delete documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = documents.organisation_id
      AND up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- Create document downloads tracking table
CREATE TABLE IF NOT EXISTS document_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  downloaded_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Create indexes for downloads
CREATE INDEX IF NOT EXISTS idx_document_downloads_document_id ON document_downloads(document_id);
CREATE INDEX IF NOT EXISTS idx_document_downloads_user_id ON document_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_document_downloads_downloaded_at ON document_downloads(downloaded_at DESC);

-- Enable RLS for downloads
ALTER TABLE document_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own downloads"
  ON document_downloads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can track downloads"
  ON document_downloads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to update download count
CREATE OR REPLACE FUNCTION update_document_download_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE documents 
  SET download_count = download_count + 1
  WHERE id = NEW.document_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update download count
CREATE TRIGGER trigger_update_download_count
  AFTER INSERT ON document_downloads
  FOR EACH ROW
  EXECUTE FUNCTION update_document_download_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER trigger_update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();