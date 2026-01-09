-- Add webhook URL column to settings table for integration with sister apps
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS integration_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS integration_webhook_enabled BOOLEAN DEFAULT false;