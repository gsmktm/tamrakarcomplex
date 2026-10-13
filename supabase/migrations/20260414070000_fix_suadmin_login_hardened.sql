-- Security correction for historical migration 20260414070000_fix_suadmin_login_hardened.sql.
-- The previous version performed hard-coded admin password reset and grants.
-- Credentials, privileged roles and real Auth identities must never be
-- created, confirmed or reset as part of normal database installation.
-- This version remains a timestamped NO-OP so fresh replay keeps its history.
-- Never reapply historic Auth mutations to an existing production project.
SELECT 1;
