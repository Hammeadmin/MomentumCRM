

-- Drop the current policy
DROP POLICY IF EXISTS "Allow authenticated users to create attachments" ON order_attachments;

-- Create policy that allows both assigned workers and org members
CREATE POLICY "Allow workers and org members to create attachments"
ON order_attachments FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by_user_id = auth.uid() AND
  (
    -- Either the user is assigned to the order
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_attachments.order_id 
      AND orders.assigned_to_user_id = auth.uid()
    )
    OR
    -- Or the user is in the same organization as the order
    EXISTS (
      SELECT 1 
      FROM orders o
      JOIN user_profiles up ON (up.organisation_id = o.organisation_id)
      WHERE o.id = order_attachments.order_id 
      AND up.id = auth.uid()
    )
  )
);