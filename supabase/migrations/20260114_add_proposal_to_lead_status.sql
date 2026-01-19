-- Add 'proposal' to lead_status enum so leads can be tracked in the Offert stage
-- This allows the Kanban pipeline to have a "Offert" column for leads with pending quotes

DO $$
BEGIN
    -- Add 'proposal' value to lead_status enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'proposal' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lead_status')
    ) THEN
        ALTER TYPE lead_status ADD VALUE 'proposal' AFTER 'qualified';
    END IF;
END $$;
