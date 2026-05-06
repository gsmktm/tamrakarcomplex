ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS source_url text,
ADD COLUMN IF NOT EXISTS source_site text;

ALTER TABLE public.guides
ADD COLUMN IF NOT EXISTS source_url text,
ADD COLUMN IF NOT EXISTS source_site text;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS source_url text,
ADD COLUMN IF NOT EXISTS source_site text;

CREATE INDEX IF NOT EXISTS idx_articles_category_created_at ON public.articles(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_published_created_at ON public.articles(published, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guides_category_created_at ON public.guides(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guides_published_created_at ON public.guides(published, created_at DESC);
