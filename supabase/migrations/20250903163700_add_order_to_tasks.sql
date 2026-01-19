-- Add a nullable column to sales_tasks to link to an order
ALTER TABLE public.sales_tasks
ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- Add an index for faster lookups
CREATE INDEX idx_sales_tasks_order_id ON public.sales_tasks(order_id);