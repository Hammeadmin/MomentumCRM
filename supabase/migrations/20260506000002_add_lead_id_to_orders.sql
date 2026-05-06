-- Add lead_id to orders for direct lead-to-order traceability.
-- The existing path (orders → quotes.lead_id → leads) only works when
-- an order has a linked quote. This column covers direct orders too.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

-- Backfill lead_id from the linked quote where possible
UPDATE orders o
SET lead_id = q.lead_id
FROM quotes q
WHERE q.order_id = o.id
  AND q.lead_id IS NOT NULL
  AND o.lead_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_lead_id ON orders(lead_id);
