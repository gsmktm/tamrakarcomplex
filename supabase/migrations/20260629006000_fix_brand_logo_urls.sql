-- Fix broken Wikipedia CDN brand logo URLs with reliable Clearbit alternatives
UPDATE brands SET logo = 'https://logo.clearbit.com/samsung.com'   WHERE slug = 'samsung'  AND (logo IS NULL OR logo LIKE '%Samsung_Logo%');
UPDATE brands SET logo = 'https://logo.clearbit.com/xiaomi.com'    WHERE slug = 'xiaomi'   AND (logo IS NULL OR logo LIKE '%Xiaomi%');
UPDATE brands SET logo = 'https://logo.clearbit.com/realme.com'    WHERE slug = 'realme'   AND (logo IS NULL OR logo LIKE '%Realme%');
UPDATE brands SET logo = 'https://logo.clearbit.com/oppo.com'      WHERE slug = 'oppo'     AND (logo IS NULL OR logo LIKE '%Oppo%' OR logo LIKE '%OPPO%');
UPDATE brands SET logo = 'https://logo.clearbit.com/oneplus.com'   WHERE slug = 'oneplus'  AND (logo IS NULL OR logo LIKE '%OnePlus%');
UPDATE brands SET logo = 'https://logo.clearbit.com/motorola.com'  WHERE slug = 'motorola' AND (logo IS NULL OR logo LIKE '%Motorola%');
UPDATE brands SET logo = 'https://logo.clearbit.com/honor.com'     WHERE slug = 'honor'    AND (logo IS NULL OR logo LIKE '%Honor%');
UPDATE brands SET logo = 'https://logo.clearbit.com/nothing.tech'  WHERE slug = 'nothing'  AND (logo IS NULL OR logo LIKE '%Nothing%');
UPDATE brands SET logo = 'https://logo.clearbit.com/infinixmobile.com' WHERE slug = 'infinix' AND (logo IS NULL OR logo LIKE '%Infinix%');
UPDATE brands SET logo = 'https://logo.clearbit.com/vivo.com'      WHERE slug = 'vivo'     AND (logo IS NULL OR logo LIKE '%Vivo%' OR logo LIKE '%vivo%');
UPDATE brands SET logo = 'https://logo.clearbit.com/mi.com'        WHERE slug = 'poco'     AND (logo IS NULL OR logo LIKE '%POCO%' OR logo LIKE '%poco%');
