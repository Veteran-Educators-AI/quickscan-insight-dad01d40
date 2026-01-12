-- Add sister app sync settings to the settings table
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS sister_app_sync_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sister_app_xp_multiplier numeric DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS sister_app_coin_multiplier numeric DEFAULT 0.25;