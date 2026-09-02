-- Repair the canonical ASUS record imported with unrelated Xiaomi artwork.
UPDATE public.products
SET image = 'https://fdn2.gsmarena.com/vv/bigpic/asus-rog-phone-7.jpg',
    updated_at = now()
WHERE slug = 'asus-rog-phone-7-pro-974-c2oxg';
