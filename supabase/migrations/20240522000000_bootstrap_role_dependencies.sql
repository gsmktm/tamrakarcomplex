-- Local replay foundation for historical migrations (May 2024 onward).
-- The May 2024 app_settings RLS policy references user_roles before the
-- February 2026 generated migration would otherwise create it.
-- This bootstrap makes the original role enum and table available in order.
-- SECURITY: RLS is enabled immediately and no public role policies are granted.
-- No role rows or permissions are seeded.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type AS t
    JOIN pg_namespace AS n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'app_role'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
