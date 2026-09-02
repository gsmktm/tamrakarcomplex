-- Verified GSMArena CDN artwork for the public repair catalog.
-- Unsupported laptops/tablets keep the application fallback instead of a wrong photo.
WITH artwork(slug, image_url) AS (
  VALUES
    ('iphone-15-pro-max', 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro-max.jpg'),
    ('iphone-15-pro', 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro.jpg'),
    ('iphone-15', 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15.jpg'),
    ('iphone-14-pro-max', 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14-pro-max-.jpg'),
    ('iphone-14', 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14.jpg'),
    ('iphone-13', 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13.jpg'),
    ('iphone-12', 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-12.jpg'),
    ('iphone-11', 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-11.jpg'),
    ('samsung-s24-ultra', 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra-5g-sm-s928.jpg'),
    ('samsung-s24-plus', 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-plus-5g-sm-s926.jpg'),
    ('samsung-s24', 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-5g-sm-s921.jpg'),
    ('samsung-a55-5g', 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a55.jpg'),
    ('samsung-a35-5g', 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a35.jpg'),
    ('samsung-s23-ultra', 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-ultra-5g.jpg'),
    ('samsung-m34-5g', 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-m34-5g.jpg'),
    ('xiaomi-14', 'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14.jpg'),
    ('redmi-note-13-pro', 'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-13-pro-5g.jpg'),
    ('poco-x6-pro', 'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-poco-x6-pro.jpg'),
    ('oneplus-12', 'https://fdn2.gsmarena.com/vv/bigpic/oneplus-12.jpg'),
    ('oneplus-12r', 'https://fdn2.gsmarena.com/vv/bigpic/oneplus-12r.jpg'),
    ('vivo-v30-pro', 'https://fdn2.gsmarena.com/vv/bigpic/vivo-v30-pro.jpg'),
    ('vivo-t3x', 'https://fdn2.gsmarena.com/vv/bigpic/vivo-t3x.jpg'),
    ('realme-gt-6', 'https://fdn2.gsmarena.com/vv/bigpic/realme-gt6.jpg'),
    ('realme-12-pro-plus', 'https://fdn2.gsmarena.com/vv/bigpic/realme-12-pro-plus.jpg')
)
UPDATE public.repair_devices AS device
SET image = artwork.image_url
FROM artwork
WHERE device.slug = artwork.slug
  AND device.image IS DISTINCT FROM artwork.image_url;
