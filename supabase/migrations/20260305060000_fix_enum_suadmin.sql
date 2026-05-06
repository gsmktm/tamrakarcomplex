-- Fix app_role enum by adding missing values
-- This needs to be run to support the new RBAC roles

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'suadmin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'public_user';
