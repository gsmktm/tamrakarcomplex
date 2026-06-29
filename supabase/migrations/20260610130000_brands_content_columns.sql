-- Brand content columns for GBN-parity brand pages
-- overview_text: long-form brand description shown on brand page
-- series_descriptions: JSONB array [{name, slug, description}]
-- service_centers: JSONB array [{name, address, phone, email}]
-- faq: JSONB array [{question, answer}]

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS overview_text TEXT,
  ADD COLUMN IF NOT EXISTS series_descriptions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS service_centers JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,
  ADD COLUMN IF NOT EXISTS website TEXT;

-- phone_series: add description column
ALTER TABLE public.phone_series
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS image TEXT;

-- phone_models: add is_top_rated if somehow missed
ALTER TABLE public.phone_models
  ADD COLUMN IF NOT EXISTS is_top_rated BOOLEAN DEFAULT false;
