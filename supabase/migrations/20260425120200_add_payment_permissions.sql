-- Add permissions for payouts and device verification modules

INSERT INTO public.staffadmin_permissions (role, permission, description) VALUES
('staffadmin', 'brands', 'Can manage brand data'),
('staffadmin', 'device_verification', 'Can verify and manage device catalog'),
('staffadmin', 'leads', 'Can manage sell phone leads'),
('staffadmin', 'payouts', 'Can manage store payouts and commissions'),
('storeadmin', 'orders', 'Can view and manage store orders'),
('storeadmin', 'payouts', 'Can view own store payouts')
ON CONFLICT (role, permission) DO NOTHING;