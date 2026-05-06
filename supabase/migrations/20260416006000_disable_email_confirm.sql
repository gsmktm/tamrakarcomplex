-- Disable email confirmation requirement (dev only)
-- Run this in Supabase SQL Editor

-- Update the site URL to allow confirmations
INSERT INTO auth.config (site_url, disable_signup, confirm_email)
VALUES ('http://localhost:8080', false, true)
ON CONFLICT (site_url) DO UPDATE SET confirm_email = true;