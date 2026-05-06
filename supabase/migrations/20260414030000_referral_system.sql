
-- Referral System: Add referral_code and referred_by to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_points INTEGER DEFAULT 0;

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

-- Trigger to auto-generate referral code for new users
CREATE OR REPLACE FUNCTION public.on_profile_create_generate_referral()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_generate_referral_code ON public.profiles;
CREATE TRIGGER tr_generate_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.on_profile_create_generate_referral();

-- Backfill existing profiles
UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;

-- Referral Earnings table
CREATE TABLE IF NOT EXISTS public.referral_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) NOT NULL,
  points_earned INTEGER DEFAULT 100,
  action_type TEXT DEFAULT 'signup', -- 'signup', 'purchase', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_history ENABLE ROW LEVEL SECURITY;

-- Policies for referral_history
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referral_history;
CREATE POLICY "Users can view their own referrals"
  ON public.referral_history
  FOR SELECT
  USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referral_history;
CREATE POLICY "Admins can view all referrals"
  ON public.referral_history
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'suadmin'::public.app_role));
