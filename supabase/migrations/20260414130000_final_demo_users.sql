-- Security correction for historical migration 20260414130000_final_demo_users.sql.
-- The previous version performed fixed-password demo users and JWT-email privileged authorization.
-- Credentials, privileged roles and real Auth identities must never be
-- created, confirmed or reset as part of normal database installation.
-- This version remains a timestamped NO-OP so fresh replay keeps its history.
-- Never reapply historic Auth mutations to an existing production project.
SELECT 1;
