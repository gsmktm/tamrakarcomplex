
-- Fix content_pages, contact_messages, chatbot_config RLS policies

-- Content Pages: Update policies to support suadmin, staffadmin, admin
DROP POLICY IF EXISTS "Public can view published content pages." ON public.content_pages;
DROP POLICY IF EXISTS "Admins can manage content pages." ON public.content_pages;

CREATE POLICY "Public can view published content pages."
  ON public.content_pages for select
  using ( is_published = true );

CREATE POLICY "Admins can manage content pages."
  ON public.content_pages for all
  using ( public.is_super_admin() OR public.has_role(auth.uid(), 'staffadmin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) )
  WITH CHECK ( public.is_super_admin() OR public.has_role(auth.uid(), 'staffadmin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) );

-- Contact Messages: Update policies
DROP POLICY IF EXISTS "Public can send messages." ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can view messages." ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can update messages." ON public.contact_messages;

CREATE POLICY "Public can send messages."
  ON public.contact_messages for insert
  with check ( true );

CREATE POLICY "Admins can view messages."
  ON public.contact_messages for select
  using ( public.is_super_admin() OR public.has_role(auth.uid(), 'staffadmin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) );

CREATE POLICY "Admins can update messages."
  ON public.contact_messages for update
  using ( public.is_super_admin() OR public.has_role(auth.uid(), 'staffadmin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) );

-- Chatbot Config: Update policies
DROP POLICY IF EXISTS "Public can view chatbot config." ON public.chatbot_config;
DROP POLICY IF EXISTS "Admins can manage chatbot config." ON public.chatbot_config;

CREATE POLICY "Public can view chatbot config."
  ON public.chatbot_config for select
  using ( true );

CREATE POLICY "Admins can manage chatbot config."
  ON public.chatbot_config for all
  using ( public.is_super_admin() OR public.has_role(auth.uid(), 'staffadmin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) )
  WITH CHECK ( public.is_super_admin() OR public.has_role(auth.uid(), 'staffadmin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) );
