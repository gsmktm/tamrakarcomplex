-- Security correction for historical migration 20260305030000_force_password_reset.sql.
-- The previous version performed forced administrator password reset and Auth identity insert.
-- Credentials, privileged roles and real Auth identities must never be
-- created, confirmed or reset as part of normal database installation.
-- This version remains a timestamped NO-OP so fresh replay keeps its history.
-- Never reapply historic Auth mutations to an existing production project.
SELECT 1;
