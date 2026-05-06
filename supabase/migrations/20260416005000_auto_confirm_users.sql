-- Auto-confirm all users (dev only)
-- Run this in Supabase SQL Editor

UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;