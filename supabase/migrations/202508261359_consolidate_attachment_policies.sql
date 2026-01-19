-- STEP 1: RESET DATABASE TABLE POLICIES FOR 'order_attachments'

-- Temporarily disable Row Level Security to clear any conflicting states.
ALTER TABLE public.order_attachments DISABLE ROW LEVEL SECURITY;

-- Drop all old policies on the table to ensure a clean slate.
DROP POLICY IF EXISTS "Allow workers to view their own order attachments" ON public.order_attachments;
DROP POLICY IF EXISTS "Allow workers to view attachments for their assigned orders" ON public.order_attachments;
DROP POLICY IF EXISTS "Allow all access for admins" ON public.order_attachments;
DROP POLICY IF EXISTS "Allow workers to insert attachments for their assigned orders" ON public.order_attachments;
-- Re-enable Row Level Security.
ALTER TABLE public.order_attachments ENABLE ROW LEVEL SECURITY;

-- Create the correct SELECT (view) policy for the database table.
CREATE POLICY "Allow SELECT on attachments for assigned workers"
ON public.order_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.orders
    WHERE public.orders.id = public.order_attachments.order_id
      AND public.orders.assigned_to_user_id = auth.uid()
  )
);

-- Create the correct INSERT (add) policy for the database table.
CREATE POLICY "Allow INSERT on attachments for assigned workers"
ON public.order_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders
    WHERE public.orders.id = public.order_attachments.order_id
      AND public.orders.assigned_to_user_id = auth.uid()
  )
);

-- STEP 2: RESET STORAGE POLICIES FOR 'order-attachments' BUCKET

-- Drop all old policies on the storage objects.
DROP POLICY IF EXISTS "Allow worker uploads for assigned orders" ON storage.objects;
DROP POLICY IF EXISTS "Allow worker downloads for assigned orders" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads for assigned workers" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated viewing for assigned workers" ON storage.objects;

-- Create the correct INSERT (upload) policy for storage.
CREATE POLICY "Allow uploads to order-attachments bucket for assigned workers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-attachments' AND
  (
    SELECT assigned_to_user_id
    FROM public.orders
    WHERE id = (storage.foldername(name))[2]::uuid
  ) = auth.uid()
);

-- Create the correct SELECT (view/download) policy for storage.
CREATE POLICY "Allow viewing from order-attachments bucket for assigned workers"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-attachments' AND
  (
    SELECT assigned_to_user_id
    FROM public.orders
    WHERE id = (storage.foldername(name))[2]::uuid
  ) = auth.uid()
);