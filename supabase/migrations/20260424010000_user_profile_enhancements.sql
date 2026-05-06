-- ==============================================================================
-- USER PROFILE ENHANCEMENTS & ADMIN AUDIT LOGGING
-- Adds referral system, device/exchange/repair visibility, and staff tracking.
-- ==============================================================================

-- 1. Referral System for Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Function to generate a unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set referral_code on profile creation
CREATE OR REPLACE FUNCTION public.set_profile_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_profile_referral_code ON public.profiles;
CREATE TRIGGER tr_set_profile_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_referral_code();

-- Update existing profiles with referral codes
UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;

-- 2. Admin/Staff Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT, -- 'store', 'subscription', 'product', 'user', etc.
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only Super Admins and Admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_admin());

-- Function to log an action
CREATE OR REPLACE FUNCTION public.log_audit_action(
    p_action TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_old_data, p_new_data)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- 3. Sync Referral Count Trigger
CREATE OR REPLACE FUNCTION public.update_referral_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referred_by IS NOT NULL THEN
        UPDATE public.profiles 
        SET referral_count = referral_count + 1
        WHERE user_id = NEW.referred_by;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_referral_count ON public.profiles;
CREATE TRIGGER tr_update_referral_count
AFTER INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.referred_by IS NOT NULL)
EXECUTE FUNCTION public.update_referral_count();

-- 4. Grant Permissions
GRANT EXECUTE ON FUNCTION public.log_audit_action(text, text, uuid, jsonb, jsonb) TO authenticated;

-- Ensure schema cache is refreshed
NOTIFY pgrst, 'reload schema';
