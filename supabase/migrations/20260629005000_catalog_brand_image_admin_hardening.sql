-- Catalog brand/image admin hardening.
-- Keeps admin brand editing, sell wizard brand logos, and public catalog queries
-- aligned even when older databases only have some of these columns.

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 999,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS website text;

UPDATE public.brands
SET
  logo_url = COALESCE(NULLIF(logo_url, ''), NULLIF(logo, '')),
  logo = COALESCE(NULLIF(logo, ''), NULLIF(logo_url, '')),
  is_active = CASE WHEN COALESCE(status, 'active') = 'active' THEN true ELSE false END,
  sort_order = CASE lower(name)
    WHEN 'apple' THEN 10
    WHEN 'samsung' THEN 20
    WHEN 'xiaomi' THEN 30
    WHEN 'oppo' THEN 40
    WHEN 'vivo' THEN 50
    WHEN 'oneplus' THEN 60
    WHEN 'realme' THEN 70
    WHEN 'honor' THEN 80
    WHEN 'huawei' THEN 90
    WHEN 'infinix' THEN 100
    WHEN 'tecno' THEN 110
    WHEN 'poco' THEN 120
    WHEN 'nothing' THEN 130
    WHEN 'motorola' THEN 140
    WHEN 'nokia' THEN 150
    WHEN 'sony' THEN 160
    WHEN 'asus' THEN 170
    WHEN 'zte' THEN 180
    WHEN 'lenovo' THEN 190
    ELSE COALESCE(sort_order, 999)
  END;

UPDATE public.brands
SET logo_url = CASE lower(name)
  WHEN 'apple' THEN COALESCE(NULLIF(logo_url, ''), 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg')
  WHEN 'samsung' THEN COALESCE(NULLIF(logo_url, ''), 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg')
  WHEN 'xiaomi' THEN COALESCE(NULLIF(logo_url, ''), 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg')
  WHEN 'oppo' THEN COALESCE(NULLIF(logo_url, ''), 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg')
  WHEN 'vivo' THEN COALESCE(NULLIF(logo_url, ''), 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png')
  WHEN 'oneplus' THEN COALESCE(NULLIF(logo_url, ''), 'https://upload.wikimedia.org/wikipedia/commons/c/c9/OnePlus_Logo.svg')
  WHEN 'realme' THEN COALESCE(NULLIF(logo_url, ''), 'https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg')
  WHEN 'honor' THEN COALESCE(NULLIF(logo_url, ''), 'https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg')
  WHEN 'huawei' THEN COALESCE(NULLIF(logo_url, ''), 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Huawei_Standard_logo.svg')
  WHEN 'poco' THEN COALESCE(NULLIF(logo_url, ''), 'https://upload.wikimedia.org/wikipedia/commons/b/b5/POCO_Logo.svg')
  WHEN 'nothing' THEN COALESCE(NULLIF(logo_url, ''), 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Nothing_Logo.svg/1200px-Nothing_Logo.svg.png')
  WHEN 'motorola' THEN COALESCE(NULLIF(logo_url, ''), 'https://upload.wikimedia.org/wikipedia/commons/9/96/Motorola_logo.svg')
  WHEN 'nokia' THEN COALESCE(NULLIF(logo_url, ''), 'https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg')
  WHEN 'sony' THEN COALESCE(NULLIF(logo_url, ''), 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg')
  WHEN 'asus' THEN COALESCE(NULLIF(logo_url, ''), 'https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg')
  ELSE logo_url
END
WHERE logo_url IS NULL OR logo_url = '';

UPDATE public.brands
SET logo = COALESCE(NULLIF(logo, ''), logo_url)
WHERE logo_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_brands_active_sort_name
  ON public.brands (is_active, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_phone_models_brand_release
  ON public.phone_models (brand_id, release_year DESC, name);

CREATE INDEX IF NOT EXISTS idx_model_images_model_featured_sort
  ON public.model_images (model_id, is_featured DESC, sort_order);

NOTIFY pgrst, 'reload schema';
