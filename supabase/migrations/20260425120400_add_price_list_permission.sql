-- Add price_list permission for staff admins

INSERT INTO public.staffadmin_permissions (role, permission, description) VALUES
('staffadmin', 'price_list', 'Can manage price list items')
ON CONFLICT (role, permission) DO NOTHING;