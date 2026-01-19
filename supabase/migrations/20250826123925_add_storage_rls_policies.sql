-- This policy allows a worker to UPLOAD a file to the 'order-attachments' bucket
-- ONLY IF they are the assigned user for the order mentioned in the file path.
-- Supabase breaks down the path for us to use in the policy.
CREATE POLICY "Allow worker uploads for assigned orders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-attachments' AND
  EXISTS (
    SELECT 1
    FROM public.orders
    -- The path is structured as "userId/orderId/fileName.ext"
    -- so path_tokens[2] gives us the orderId.
    WHERE public.orders.id = (path_tokens[2])::uuid
      AND public.orders.assigned_to_user_id = auth.uid()
  )
);

-- This policy allows a worker to VIEW a file from the 'order-attachments' bucket
-- ONLY IF they are the assigned user for that order.
CREATE POLICY "Allow worker downloads for assigned orders"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-attachments' AND
  EXISTS (
    SELECT 1
    FROM public.orders
    WHERE public.orders.id = (path_tokens[2])::uuid
      AND public.orders.assigned_to_user_id = auth.uid()
  )
);