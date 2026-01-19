-- Drop all previous policies
DROP POLICY IF EXISTS "Allow worker uploads for assigned orders" ON storage.objects;
DROP POLICY IF EXISTS "Allow worker downloads for assigned orders" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads for assigned workers" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated viewing for assigned workers" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to order-attachments bucket for assigned workers" ON storage.objects;
DROP POLICY IF EXISTS "Allow viewing from order-attachments bucket for assigned workers" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view files in their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload to order-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view order-attachments" ON storage.objects;

-- Create upload policy with safe UUID conversion
CREATE POLICY "Allow users to upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-attachments' AND
  array_length(storage.foldername(name), 1) >= 1 AND
  CASE 
    WHEN (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN auth.uid() = (storage.foldername(name))[1]::uuid
    ELSE false
  END
);

-- Create view policy with safe UUID conversion
CREATE POLICY "Allow users to view files in their own folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-attachments' AND
  array_length(storage.foldername(name), 1) >= 1 AND
  CASE 
    WHEN (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN auth.uid() = (storage.foldername(name))[1]::uuid
    ELSE false
  END
);