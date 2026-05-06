-- Migration: Add phone and location columns to profiles table
-- These were previously stored in localStorage only, which causes data loss
-- when users switch devices or browsers.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS location text;

-- Add a comment for clarity
COMMENT ON COLUMN public.profiles.phone IS 'User contact phone number, e.g. +977 98XXXXXXXX';
COMMENT ON COLUMN public.profiles.location IS 'User display location, e.g. Kathmandu, Nepal';
