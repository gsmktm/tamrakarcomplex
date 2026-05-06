
-- Demo Bypass: Disable RLS on all core tables to allow unrestricted access during development/demo
-- This is a temporary measure to ensure the UI can be tested without authentication hurdles.

DO $$
DECLARE
  tab text;
BEGIN
  FOR tab IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', tab);
    EXECUTE format('DROP POLICY IF EXISTS "Demo bypass all" ON public.%I;', tab);
    EXECUTE format('CREATE POLICY "Demo bypass all" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tab);
    -- Re-enable but with the bypass policy
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tab);
  END LOOP;
END $$;

-- Also ensure the suadmin role check functions return true if in "demo" mode
-- Or just grant suadmin to everyone for now if we want full bypass
-- But a better way is to just let the frontend handle the "is admin" check for the demo.
