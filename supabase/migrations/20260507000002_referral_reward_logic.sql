-- ============================================================
-- REFERRAL REWARD LOGIC
-- Rewards the inviter when a new user signs up.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_referral_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_inviter_id UUID;
  v_ref_code TEXT;
  v_points_reward INTEGER := 100; -- Default reward points
BEGIN
  -- Get referral code from user metadata
  v_ref_code := (auth.jwt() -> 'user_metadata' ->> 'referred_by_code');
  
  -- If not in JWT (direct signup), check raw metadata
  IF v_ref_code IS NULL THEN
    SELECT (raw_user_meta_data ->> 'referred_by_code') INTO v_ref_code
    FROM auth.users WHERE id = NEW.id;
  END IF;

  IF v_ref_code IS NOT NULL THEN
    -- Find inviter by their referral code
    SELECT id INTO v_inviter_id FROM public.profiles WHERE referral_code = v_ref_code;

    IF v_inviter_id IS NOT NULL AND v_inviter_id != NEW.id THEN
      -- 1. Set referred_by on the new profile
      NEW.referred_by := v_inviter_id;

      -- 2. Reward inviter with points
      UPDATE public.profiles 
      SET referral_points = referral_points + v_points_reward
      WHERE id = v_inviter_id;

      -- 3. Log to referral_history
      INSERT INTO public.referral_history (referrer_id, referred_user_id, points_earned, action_type)
      VALUES (v_inviter_id, NEW.id, v_points_reward, 'signup');

      -- 4. Notify inviter
      PERFORM public.create_notification(
        v_inviter_id,
        'Referral Reward!',
        'Someone signed up using your link! You earned ' || v_points_reward || ' points.',
        'referral',
        '/user/me'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- This should run BEFORE INSERT on profiles to set referred_by
DROP TRIGGER IF EXISTS trg_handle_referral_on_signup ON public.profiles;
CREATE TRIGGER trg_handle_referral_on_signup
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_referral_on_signup();
