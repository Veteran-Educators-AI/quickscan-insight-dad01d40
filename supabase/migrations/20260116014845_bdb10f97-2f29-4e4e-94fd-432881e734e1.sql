-- Add webhook API key column to settings table
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS integration_webhook_api_key TEXT;