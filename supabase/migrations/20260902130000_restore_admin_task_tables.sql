-- Hotfix: restore admin task tables lost to manual-application drift
-- (20260425020000_admin_task_system.sql is recorded as applied on this
-- database but its tables never landed). The audit trigger from the original
-- migration is intentionally omitted: public.log_audit_action() does not
-- exist on this database (superseded by fn_audit_privileged_change), and the
-- RLS policies below already gate access.

CREATE TABLE IF NOT EXISTS public.admin_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    assigned_to_user_id uuid REFERENCES auth.users(id),
    assigned_role_type text NOT NULL, -- staffadmin, storeadmin
    module_key text, -- users, stores, products, etc.
    target_store_id uuid REFERENCES public.stores(id),
    target_user_id uuid REFERENCES auth.users(id),
    priority text DEFAULT 'medium', -- low, medium, high, urgent
    status text DEFAULT 'pending', -- pending, in_progress, completed, cancelled, overdue
    due_date TIMESTAMP WITH TIME ZONE,
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_task_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid REFERENCES public.admin_tasks(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    content text NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins can manage all tasks" ON public.admin_tasks;
CREATE POLICY "Superadmins can manage all tasks"
ON public.admin_tasks FOR ALL
TO authenticated
USING (public.is_super_admin());

DROP POLICY IF EXISTS "Admins can view their assigned tasks" ON public.admin_tasks;
CREATE POLICY "Admins can view their assigned tasks"
ON public.admin_tasks FOR SELECT
TO authenticated
USING (assigned_to_user_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Admins can update their assigned tasks" ON public.admin_tasks;
CREATE POLICY "Admins can update their assigned tasks"
ON public.admin_tasks FOR UPDATE
TO authenticated
USING (assigned_to_user_id = auth.uid())
WITH CHECK (assigned_to_user_id = auth.uid());

DROP POLICY IF EXISTS "Task comments visibility" ON public.admin_task_comments;
CREATE POLICY "Task comments visibility"
ON public.admin_task_comments FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.admin_tasks
        WHERE id = admin_task_comments.task_id
        AND (assigned_to_user_id = auth.uid() OR created_by = auth.uid() OR public.is_super_admin())
    )
);

DROP POLICY IF EXISTS "Task comments insertion" ON public.admin_task_comments;
CREATE POLICY "Task comments insertion"
ON public.admin_task_comments FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_tasks
        WHERE id = admin_task_comments.task_id
        AND (assigned_to_user_id = auth.uid() OR created_by = auth.uid() OR public.is_super_admin())
    )
);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_assignee ON public.admin_tasks (assigned_to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_due ON public.admin_tasks (due_date) WHERE status NOT IN ('completed', 'cancelled');
