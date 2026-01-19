-- Add a status column to sales_tasks to track if it's pending, completed, or denied
ALTER TABLE public.sales_tasks
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';

-- Add a column to store who created the task
ALTER TABLE public.sales_tasks
ADD COLUMN created_by UUID REFERENCES public.user_profiles(id);

-- Create a new table for task notes to keep a history of comments
CREATE TABLE public.task_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.sales_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

