-- Add QR code scanning settings
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS auto_qr_scan_enabled boolean DEFAULT true;