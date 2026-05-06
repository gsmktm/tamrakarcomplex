-- Add new permission modules for staff admin
INSERT INTO public.staffadmin_permissions (role, permission, description) VALUES
('staffadmin', 'brands', 'Can manage brand data'),
('staffadmin', 'device_verification', 'Can verify and manage device catalog')
ON CONFLICT (role, permission) DO NOTHING;