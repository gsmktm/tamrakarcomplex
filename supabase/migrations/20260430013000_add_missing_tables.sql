-- Create missing tables used by frontend

-- 1. referral_invites
CREATE TABLE IF NOT EXISTS public.referral_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    invitee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    email text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.referral_invites ENABLE ROW LEVEL SECURITY;

-- 3. user_addresses
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    type text DEFAULT 'home' CHECK (type IN ('home', 'work', 'other')),
    name text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    postal_code text,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- 4. user_wallets
CREATE TABLE IF NOT EXISTS public.user_wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    balance numeric DEFAULT 0,
    total_earned numeric DEFAULT 0,
    total_redeemed numeric DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- 5. wallet_transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    type text NOT NULL CHECK (type IN ('credit', 'debit')),
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- referral_invites
DROP POLICY IF EXISTS "Users manage own referral invites" ON public.referral_invites;
CREATE POLICY "Users manage own referral invites" ON public.referral_invites
    FOR ALL USING (inviter_id = auth.uid());

DROP POLICY IF EXISTS "Admins view all referral invites" ON public.referral_invites;
CREATE POLICY "Admins view all referral invites" ON public.referral_invites
    FOR SELECT USING (public.is_staff_admin());

-- user_addresses
DROP POLICY IF EXISTS "Users manage own addresses" ON public.user_addresses;
CREATE POLICY "Users manage own addresses" ON public.user_addresses
    FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins view all addresses" ON public.user_addresses;
CREATE POLICY "Admins view all addresses" ON public.user_addresses
    FOR SELECT USING (public.is_staff_admin());

-- user_wallets
DROP POLICY IF EXISTS "Users view own wallet" ON public.user_wallets;
CREATE POLICY "Users view own wallet" ON public.user_wallets
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all wallets" ON public.user_wallets;
CREATE POLICY "Admins manage all wallets" ON public.user_wallets
    FOR ALL USING (public.is_staff_admin());

-- wallet_transactions
DROP POLICY IF EXISTS "Users view own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users view own wallet transactions" ON public.wallet_transactions
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins view all wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins view all wallet transactions" ON public.wallet_transactions
    FOR SELECT USING (public.is_staff_admin());

-- RPC for point conversion
CREATE OR REPLACE FUNCTION public.convert_points_to_wallet(p_user_id uuid, p_points_amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_id uuid;
    v_money_amount numeric;
BEGIN
    -- Check if user has enough points
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = p_user_id AND (referral_points >= p_points_amount)
    ) THEN
        RAISE EXCEPTION 'Insufficient points';
    END IF;

    -- Calculate money amount (100 points = Rs. 10)
    v_money_amount := (p_points_amount / 100.0) * 10.0;

    -- Update profile points
    UPDATE public.profiles 
    SET referral_points = referral_points - p_points_amount
    WHERE id = p_user_id;

    -- Ensure wallet exists
    INSERT INTO public.user_wallets (user_id, balance, total_earned)
    VALUES (p_user_id, v_money_amount, v_money_amount)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_wallets.balance + v_money_amount,
        total_earned = public.user_wallets.total_earned + v_money_amount
    RETURNING id INTO v_wallet_id;

    -- Log transaction
    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (p_user_id, v_money_amount, 'credit', 'Points conversion: ' || p_points_amount || ' points');

    RETURN true;
END;
$$;
