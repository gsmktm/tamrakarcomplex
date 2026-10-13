-- Security correction for historical migration 20260210173000_manual_create_gsktm.sql.
-- The previous version performed hard-coded privileged Auth user provisioning.
-- Credentials, privileged roles and real Auth identities must never be
-- created, confirmed or reset as part of normal database installation.
-- This version remains a timestamped NO-OP so fresh replay keeps its history.
-- Never reapply historic Auth mutations to an existing production project.
SELECT 1;
