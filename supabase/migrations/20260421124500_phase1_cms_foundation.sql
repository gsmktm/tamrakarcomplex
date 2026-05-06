-- Phase 1: Database & CMS Foundation for Tamrakar Complex v2.0
-- This migration sets up the dynamic CMS, layout schemas, and social media tokens.

-----------------------------------------
-- 1. Dynamic CMS (Admin Editable Front-End)
-----------------------------------------

CREATE TABLE IF NOT EXISTS public.site_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.page_layouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_name TEXT UNIQUE NOT NULL,
  layout_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-----------------------------------------
-- 2. Social Media API Tables (Omnichannel Engine)
-----------------------------------------

CREATE TABLE IF NOT EXISTS public.social_oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE, -- NULL means it's a global platform token
  provider TEXT NOT NULL, -- e.g., 'facebook', 'tiktok', 'linkedin', 'google'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(store_id, provider)
);

-----------------------------------------
-- 3. Universal User Tracking Extension
-----------------------------------------
-- Note: 'wishlist', 'repair_requests', and 'exchange_requests' tables 
-- already exist from previous migrations. Here we add login_history.

CREATE TABLE IF NOT EXISTS public.user_login_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_time TIMESTAMPTZ DEFAULT now() NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);

-----------------------------------------
-- 4. Enable Row Level Security (RLS)
-----------------------------------------

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;

-----------------------------------------
-- 5. RLS Policies
-----------------------------------------

-- Site Content
DROP POLICY IF EXISTS "Public can view active site content" ON public.site_content;
CREATE POLICY "Public can view active site content" 
ON public.site_content FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super Admins can manage site content" ON public.site_content;
CREATE POLICY "Super Admins can manage site content" 
ON public.site_content FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin'
  )
);

-- Page Layouts
DROP POLICY IF EXISTS "Public can view active page layouts" ON public.page_layouts;
CREATE POLICY "Public can view active page layouts" 
ON public.page_layouts FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Super Admins can manage page layouts" ON public.page_layouts;
CREATE POLICY "Super Admins can manage page layouts" 
ON public.page_layouts FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin'
  )
);

-- Social OAuth Tokens (Extremely Restricted)
-- Only super admins can access global tokens. Store admins can only access their store's tokens.
DROP POLICY IF EXISTS "Super Admins have full access to social tokens" ON public.social_oauth_tokens;
CREATE POLICY "Super Admins have full access to social tokens"
ON public.social_oauth_tokens FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Store admins can manage their own store tokens" ON public.social_oauth_tokens;
CREATE POLICY "Store admins can manage their own store tokens"
ON public.social_oauth_tokens FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.stores 
    WHERE stores.id = social_oauth_tokens.store_id AND stores.vendor_id = auth.uid()
  )
);

-- User Login History
DROP POLICY IF EXISTS "Super admins can view all login history" ON public.user_login_history;
CREATE POLICY "Super admins can view all login history"
ON public.user_login_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Users can insert and view their own login history" ON public.user_login_history;
CREATE POLICY "Users can insert and view their own login history"
ON public.user_login_history FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-----------------------------------------
-- 6. Updated At Triggers
-----------------------------------------

CREATE TRIGGER set_timestamp_site_content
BEFORE UPDATE ON public.site_content
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_timestamp_page_layouts
BEFORE UPDATE ON public.page_layouts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_timestamp_social_oauth_tokens
BEFORE UPDATE ON public.social_oauth_tokens
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
