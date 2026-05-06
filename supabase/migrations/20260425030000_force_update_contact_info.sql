-- Force update contact information in app_settings table
-- This migration ensures the database values match the requested updates

INSERT INTO public.app_settings (key, value)
VALUES (
  'contact_info',
  '{
    "email": "info@tamrakarcomplex.com",
    "phone": "+977-015351731",
    "address": "New Road TamrakarComplex , Kathmandu",
    "whatsapp": "+9779851091542"
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();
