-- Migration: Add provider column to user_smtp_settings
-- This allows tracking which email provider preset the user selected
-- Default value 'custom' ensures backwards compatibility for existing users

ALTER TABLE public.user_smtp_settings 
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'custom';

-- Add a comment for documentation
COMMENT ON COLUMN public.user_smtp_settings.provider IS 'Email provider preset: gmail, outlook, loopia, onecom, binero, bahnhof, or custom';
