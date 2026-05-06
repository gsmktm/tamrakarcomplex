-- Auto-confirm specific dev users
-- Run this in Supabase SQL Editor

UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmed_at = NOW()
WHERE lower(email) IN (
  lower('admin@tamrakarcomplex.com'),
  lower('store@tamrakarcomplex.com'),
  lower('user@tamrakarcomplex.com')
);