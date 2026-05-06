
-- Add phone column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update handle_new_user function to capture phone from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add sell_phone_logos and sell_phone_content to app_settings
INSERT INTO public.app_settings (key, value)
VALUES 
  ('sell_phone_logos', '{
    "Apple": "https://cdn.simpleicons.org/apple/000000",
    "Samsung": "https://cdn.simpleicons.org/samsung/1428A0",
    "Xiaomi": "https://cdn.simpleicons.org/xiaomi/FF6700",
    "OnePlus": "https://cdn.simpleicons.org/oneplus/F3122E",
    "Google": "https://cdn.simpleicons.org/google/4285F4",
    "Realme": "https://cdn.simpleicons.org/realme/FFCD00",
    "Oppo": "https://cdn.simpleicons.org/oppo/05BA4B",
    "Vivo": "https://cdn.simpleicons.org/vivo/415FFF",
    "Honor": "https://cdn.simpleicons.org/honor/000000",
    "Huawei": "https://cdn.simpleicons.org/huawei/FF0000",
    "Infinix": "https://cdn.simpleicons.org/infinix/000000",
    "Tecno": "https://cdn.simpleicons.org/tecnomobile/00529B",
    "Poco": "https://cdn.simpleicons.org/poco/000000",
    "Nothing": "https://cdn.simpleicons.org/nothing/000000",
    "Motorola": "https://cdn.simpleicons.org/motorola/000000",
    "Nokia": "https://cdn.simpleicons.org/nokia/001135",
    "Sony": "https://cdn.simpleicons.org/sony/000000",
    "Asus": "https://cdn.simpleicons.org/asus/00539B",
    "ZTE": "https://cdn.simpleicons.org/zte/005EB4",
    "Lenovo": "https://cdn.simpleicons.org/lenovo/E2231A"
  }'::jsonb),
  ('sell_phone_content', '{
    "headline": "Sell Your Phone",
    "subheadline": "Get an instant quote in less than 60 seconds.",
    "step1_title": "Select your Phone''s Brand",
    "step2_title": "Select Model",
    "step3_title": "Device Details"
  }'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
