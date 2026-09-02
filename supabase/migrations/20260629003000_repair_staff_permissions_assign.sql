-- Ensure staff_permissions table exists, then add can_assign column
CREATE TABLE IF NOT EXISTS public.staff_permissions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key     text NOT NULL,
  can_view       boolean DEFAULT false,
  can_create     boolean DEFAULT false,
  can_edit       boolean DEFAULT false,
  can_delete     boolean DEFAULT false,
  can_approve    boolean DEFAULT false,
  can_assign     boolean DEFAULT false,
  can_export     boolean DEFAULT false,
  granted_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (staff_user_id, module_key)
);

ALTER TABLE public.staff_permissions
  ADD COLUMN IF NOT EXISTS can_assign boolean DEFAULT false;

CREATE OR REPLACE VIEW public.staffadmin_permissions AS
SELECT
  id,
  staff_user_id AS user_id,
  module_key,
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_approve,
  can_assign,
  can_export,
  granted_by,
  created_at,
  updated_at
FROM public.staff_permissions;
