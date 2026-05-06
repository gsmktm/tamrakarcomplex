-- Migration: Add Unlocking Features and Catalog
-- Description: Adds tables for unlocking models and features based on ChimeraTool.

-- Create table for unlocking features
CREATE TABLE IF NOT EXISTS public.unlock_catalog (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    variant TEXT,
    release_year INTEGER,
    supported_features TEXT[], -- Array of feature names: 'FRP Removal', 'IMEI Repair', etc.
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.unlock_catalog ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow public read unlock_catalog" ON public.unlock_catalog;
CREATE POLICY "Allow public read unlock_catalog" ON public.unlock_catalog FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow suadmin manage unlock_catalog" ON public.unlock_catalog;
CREATE POLICY "Allow suadmin manage unlock_catalog" ON public.unlock_catalog FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'suadmin')
);

-- Index for searching
CREATE INDEX IF NOT EXISTS idx_unlock_catalog_brand_model ON public.unlock_catalog(brand, model);

-- Seed data for some latest models from 2022-2026 (based on ChimeraTool pattern)
INSERT INTO public.unlock_catalog (brand, model, release_year, supported_features) VALUES
('Google', 'Pixel 9 Pro XL', 2024, ARRAY['Bootloader Lock', 'Bootloader Unlock', 'Bypass IT Admin Lock', 'Get Info', 'Network Factory Reset', 'Repair IMEI', 'Root / Unroot']),
('Google', 'Pixel 9 Pro Fold', 2024, ARRAY['Get Info', 'Network Factory Reset', 'Repair IMEI']),
('Google', 'Pixel 9 Pro', 2024, ARRAY['Bootloader Lock', 'Bootloader Unlock', 'Get Info', 'Network Factory Reset', 'Repair IMEI', 'Root / Unroot']),
('Google', 'Pixel 9', 2024, ARRAY['Bootloader Lock', 'Bootloader Unlock', 'Bypass IT Admin Lock', 'Get Info', 'Network Factory Reset', 'Repair IMEI', 'Root / Unroot']),
('Google', 'Pixel 8a', 2024, ARRAY['Bootloader Unlock', 'Bypass IT Admin Lock', 'Get Info', 'Network Factory Reset', 'Repair IMEI', 'Root / Unroot']),
('Google', 'Pixel 8 Pro', 2023, ARRAY['Bootloader Unlock', 'Bypass IT Admin Lock', 'FRP Removal', 'IMEI Repair']),
('Google', 'Pixel 8', 2023, ARRAY['Bypass IT Admin Lock', 'Get Info', 'Network Factory Reset', 'Repair IMEI', 'Root / Unroot']),
('Google', 'Pixel 7a', 2023, ARRAY['Bootloader Lock', 'Bootloader Unlock', 'Bypass IT Admin Lock', 'Get Info', 'Network Factory Reset', 'Repair IMEI', 'Root / Unroot']),
('Google', 'Pixel Fold', 2023, ARRAY['Bootloader Unlock', 'Bypass IT Admin Lock', 'Get Info', 'Network Factory Reset', 'Repair IMEI', 'Root / Unroot']),
('Google', 'Pixel 7 Pro', 2022, ARRAY['Bootloader Lock', 'Bootloader Unlock', 'Bypass IT Admin Lock', 'Get Info', 'Network Factory Reset', 'Repair IMEI', 'Root / Unroot']),
('Google', 'Pixel 7', 2022, ARRAY['Bootloader Lock', 'Bootloader Unlock', 'Bypass IT Admin Lock', 'Get Info', 'Network Factory Reset', 'Repair IMEI', 'Root / Unroot']),
('Google', 'Pixel 6a', 2022, ARRAY['Bootloader Lock', 'Bootloader Unlock', 'Bypass IT Admin Lock', 'Factory Reset', 'Get Info', 'Network Factory Reset', 'Repair IMEI', 'Root / Unroot']),
('Samsung', 'Galaxy S24 Ultra', 2024, ARRAY['Read Codes', 'Direct Unlock', 'FRP Removal', 'IMEI Repair', 'Patch Certificate', 'Read/Write Cert']),
('Samsung', 'Galaxy S24+', 2024, ARRAY['Read Codes', 'Direct Unlock', 'FRP Removal', 'IMEI Repair']),
('Samsung', 'Galaxy S24', 2024, ARRAY['Read Codes', 'Direct Unlock', 'FRP Removal', 'IMEI Repair']),
('Samsung', 'Galaxy Z Fold5', 2023, ARRAY['Direct Unlock', 'FRP Removal', 'Read Codes', 'Knox MDM Bypass']),
('Samsung', 'Galaxy Z Flip5', 2023, ARRAY['Direct Unlock', 'FRP Removal', 'Read Codes']),
('Samsung', 'Galaxy S23 Ultra', 2023, ARRAY['Read Codes', 'Direct Unlock', 'FRP Removal', 'IMEI Repair', 'Patch Certificate']),
('Samsung', 'Galaxy S22 Ultra', 2022, ARRAY['Read Codes', 'Direct Unlock', 'FRP Removal', 'IMEI Repair', 'Patch Certificate']),
('Xiaomi', '14 Ultra', 2024, ARRAY['Bootloader Unlock', 'FRP Removal', 'MI Account Bypass', 'Flash Firmware', 'Repair IMEI']),
('Xiaomi', '13 Pro', 2023, ARRAY['Bootloader Unlock', 'FRP Removal', 'MI Account Bypass', 'Flash Firmware', 'Repair IMEI']),
('Xiaomi', 'Redmi Note 13 Pro+', 2024, ARRAY['FRP Removal', 'MI Account Bypass', 'Flash Firmware', 'Repair IMEI']),
('OnePlus', '12', 2024, ARRAY['Bootloader Unlock', 'FRP Removal', 'Flash Firmware', 'IMEI Repair']),
('OnePlus', '11', 2023, ARRAY['Bootloader Unlock', 'FRP Removal', 'Flash Firmware', 'IMEI Repair']),
('Apple', 'iPhone 15 Pro Max', 2023, ARRAY['iCloud Bypass (Limited)', 'Network Unlock', 'Read Info', 'Diagnostics Mode']),
('Apple', 'iPhone 15', 2023, ARRAY['iCloud Bypass (Limited)', 'Network Unlock', 'Read Info']),
('Apple', 'iPhone 14 Pro Max', 2022, ARRAY['iCloud Bypass (Limited)', 'Network Unlock', 'Read Info']);
