-- Historical developer-only bulk email confirmation disabled.
-- Direct Auth confirmation for named accounts must never run as schema DML;
-- current Supabase also exposes confirmed_at as a generated column.
-- All verification must pass through supported Supabase Auth flows.
SELECT 1;
