-- 1. Normalize Brands Table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS canonical_name text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS aliases text[];

-- Sync existing data
UPDATE public.brands SET canonical_name = name WHERE canonical_name IS NULL;

-- 2. Enhance Device Models Table
ALTER TABLE public.device_models
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS source_url text,
ADD COLUMN IF NOT EXISTS source_site text,
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS model_year integer,
ADD COLUMN IF NOT EXISTS storage_options text[];

-- Sync existing model_year from launch_year if it exists
UPDATE public.device_models SET model_year = launch_year WHERE model_year IS NULL AND launch_year IS NOT NULL;

-- 3. Price Value Sync Trigger for Products
CREATE OR REPLACE FUNCTION public.sync_product_price_value()
RETURNS TRIGGER AS $$
DECLARE
    price_numeric integer;
BEGIN
    -- Extract numbers from price string (e.g., "Rs. 1,89,999" -> 189999)
    -- This handles "Rs.", commas, and spaces
    IF NEW.price IS NOT NULL THEN
        price_numeric := (regexp_replace(NEW.price, '[^0-9]', '', 'g'))::integer;
        NEW.price_value := price_numeric;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_product_price_value ON public.products;
CREATE TRIGGER tr_sync_product_price_value
BEFORE INSERT OR UPDATE OF price ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_product_price_value();

-- Update existing products
UPDATE public.products SET price = price WHERE price IS NOT NULL;

-- 4. Device Search Events Table (Popularity Tracking)
CREATE TABLE IF NOT EXISTS public.device_search_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id uuid REFERENCES public.device_models(id) ON DELETE CASCADE,
    search_query text,
    event_type text NOT NULL, -- 'search', 'click', 'view'
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for ranking by popularity
CREATE INDEX IF NOT EXISTS idx_device_search_events_device_id ON public.device_search_events(device_id);
CREATE INDEX IF NOT EXISTS idx_device_search_events_created_at ON public.device_search_events(created_at);

-- 5. Marketplace Store-Based Listings
ALTER TABLE public.sell_listings
ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;

-- 6. Store Payout Settings
CREATE TABLE IF NOT EXISTS public.store_payout_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE UNIQUE,
    payout_method text NOT NULL, -- 'esewa', 'bank_transfer', 'khalti'
    payout_details jsonb NOT NULL, -- Account number, bank name, etc.
    is_active boolean DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_search_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_payout_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone can view popular devices" ON public.device_search_events;
CREATE POLICY "Anyone can view popular devices" ON public.device_search_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can insert search events" ON public.device_search_events;
CREATE POLICY "Authenticated can insert search events" ON public.device_search_events FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public can insert search events" ON public.device_search_events;
CREATE POLICY "Public can insert search events" ON public.device_search_events FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Store admins can manage their payout settings" ON public.store_payout_settings;
CREATE POLICY "Store admins can manage their payout settings"
ON public.store_payout_settings FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.store_admins
        WHERE store_id = store_payout_settings.store_id
        AND user_id = auth.uid()
    ) OR public.is_staff_admin()
);

-- 7. Add Ranking View for Popularity
CREATE OR REPLACE VIEW public.popular_devices AS
SELECT 
    dm.id,
    dm.name,
    dm.brand_id,
    b.name as brand_name,
    COUNT(dse.id) as interaction_count
FROM public.device_models dm
JOIN public.brands b ON dm.brand_id = b.id
LEFT JOIN public.device_search_events dse ON dm.id = dse.device_id
-- 8. Seed Other Stores (81 Stores)
-- Bulk insertion of store directory data
DO $$
DECLARE
    store_data JSONB[] := ARRAY[
        '{"name": "A.H.", "initials": "A"}',
        '{"name": "Apple Asia Nepal", "initials": "AA"}',
        '{"name": "Apple Store ExcuseMe", "initials": "AS"}',
        '{"name": "Apple Trade Hub", "initials": "AT"}',
        '{"name": "AT Stores NPL", "initials": "AS"}',
        '{"name": "Best Tech Center", "initials": "BT"}',
        '{"name": "BIG Smart Phone World", "initials": "BS"}',
        '{"name": "Cell Phone", "initials": "CP"}',
        '{"name": "Cell Phonix (Kalpana)", "initials": "CP"}',
        '{"name": "Computronics Vision", "initials": "CV"}',
        '{"name": "DD Mobile Hub", "initials": "DM"}',
        '{"name": "Demand Mobile", "initials": "DM"}',
        '{"name": "Digi Mobile", "initials": "DM"}',
        '{"name": "Doctor Mobile", "initials": "DM"}',
        '{"name": "E-Zone Mobile", "initials": "EM"}',
        '{"name": "E-Zone Mobile (Ground Floor)", "initials": "EM"}',
        '{"name": "Easy Mobile Care", "initials": "EM"}',
        '{"name": "Emmanuel Mobile Care Pvt. Ltd.", "initials": "EM"}',
        '{"name": "ETSX Nepal", "initials": "EN"}',
        '{"name": "ExcuseMe Electronics Pvt. Ltd.", "initials": "EE"}',
        '{"name": "ExcuseMe Laptop Zone", "initials": "EL"}',
        '{"name": "Fourteen G Mobile", "initials": "FG"}',
        '{"name": "Future Tech Trade Pvt. Ltd.", "initials": "FT"}',
        '{"name": "Gadget Nepal", "initials": "GN", "address": "Shop No. 45, 2nd Floor, Tamrakar Complex"}',
        '{"name": "Gidgets", "initials": "G"}',
        '{"name": "Gizma Store", "initials": "GS"}',
        '{"name": "Global Phone Arena", "initials": "GP"}',
        '{"name": "Icefall Hub (Sagar)", "initials": "IH"}',
        '{"name": "Infinity Gadgets & Tech", "initials": "IG"}',
        '{"name": "IZONE", "initials": "I"}',
        '{"name": "Jio Laptop Zone", "initials": "JL"}',
        '{"name": "Jio Mobiles World", "initials": "JM"}',
        '{"name": "Joy Store", "initials": "JS"}',
        '{"name": "JS Mobile", "initials": "JM"}',
        '{"name": "JU Mobile", "initials": "JM"}',
        '{"name": "K & K Mobile Hub", "initials": "K&"}',
        '{"name": "Kamal Mobile", "initials": "KM"}',
        '{"name": "Laptop Zone", "initials": "LZ"}',
        '{"name": "MERINA Mobile Center", "initials": "MM"}',
        '{"name": "Mi Service Center", "initials": "MS"}',
        '{"name": "Micro Mobile House Pvt. Ltd.", "initials": "MM"}',
        '{"name": "MK 2", "initials": "M2"}',
        '{"name": "MLC Mobile Store", "initials": "MM"}',
        '{"name": "MOBITECH Mobile Store", "initials": "MM"}',
        '{"name": "Mr. Mobi Pvt. Ltd.", "initials": "MM"}',
        '{"name": "Newroad Show Nepal", "initials": "NS"}',
        '{"name": "Ocean Mobile Zone", "initials": "OM"}',
        '{"name": "One Store", "initials": "OS"}',
        '{"name": "OnTech Store Pvt. Ltd.", "initials": "OS"}',
        '{"name": "PEAK Mobile", "initials": "PM"}',
        '{"name": "Pixel Plus LTD", "initials": "PP"}',
        '{"name": "Prince Electronics Pvt. Ltd.", "initials": "PE"}',
        '{"name": "Quick Mobile", "initials": "QM"}',
        '{"name": "R.K. Mobile Repairing", "initials": "RM"}',
        '{"name": "Relief Mobile Store Pvt. Ltd.", "initials": "RM"}',
        '{"name": "Samsung Mobile & Electronics Pvt. Ltd.", "initials": "SM"}',
        '{"name": "Smart Phone Gallery", "initials": "SP"}',
        '{"name": "Smart Watch Gallery", "initials": "SW"}',
        '{"name": "Smart Zone", "initials": "SZ"}',
        '{"name": "Subha Central Mobile", "initials": "SC"}',
        '{"name": "Talk & Me", "initials": "T&"}',
        '{"name": "Tamrakar Laptop Zone", "initials": "TL"}',
        '{"name": "Tamrakar Mobile", "initials": "TM"}',
        '{"name": "Tamrakar Mobile Hub", "initials": "TM", "address": "Shop No. 12, Ground Floor, Tamrakar Complex"}',
        '{"name": "Tamrakar Official Store", "initials": "TO", "address": "New Road, Kathmandu"}',
        '{"name": "TATHAASTU", "initials": "T"}',
        '{"name": "Tele World", "initials": "TW"}',
        '{"name": "The Cellular Point", "initials": "TC"}',
        '{"name": "The Cloud Store", "initials": "TC"}',
        '{"name": "The Mobile Repair", "initials": "TM"}',
        '{"name": "Tirupati Mobile Center", "initials": "TM"}',
        '{"name": "TMF Enterprises", "initials": "TE"}',
        '{"name": "TRENDZ", "initials": "T"}',
        '{"name": "Two Four Six", "initials": "TF"}',
        '{"name": "WAVE Store", "initials": "WS"}',
        '{"name": "Yantra Mobile Hub", "initials": "YM"}',
        '{"name": "Zenith Mobile Hub Pvt. Ltd.", "initials": "ZM"}',
        '{"name": "Zokia G2", "initials": "ZG"}',
        '{"name": "EvoStore Tamrakar", "initials": "ET", "address": "Shop No. 5, Ground Floor"}',
        '{"name": "Shop (Raju Ji)", "initials": "S("}'
    ];
    store_info JSONB;
    package_type text;
    package_expires timestamptz;
BEGIN
    FOREACH store_info IN ARRAY store_data LOOP
        -- Randomly assign Gold or Diamond (mostly Gold)
        IF random() < 0.2 THEN
            package_type := ''diamond'';
        ELSE
            package_type := ''gold'';
        END IF;
        
        -- 90 Days Free trial
        package_expires := now() + interval ''90 days'';
        
        INSERT INTO public.stores (
            name, 
            slug, 
            package_slug, 
            subscription_status, 
            subscription_end_date, 
            complex_zone, 
            location,
            address,
            status,
            is_verified
        )
        VALUES (
            store_info->>''name'',
            lower(regexp_replace(store_info->>''name'', ''[^a-zA-Z0-9]+'', ''-'', ''g'')),
            package_type,
            ''active'',
            package_expires,
            ''inside'',
            ''Tamrakar Complex'',
            COALESCE(store_info->>''address'', ''Tamrakar Complex, Pakosadak, Newroad, Kathmandu''),
            ''active'',
            true
        )
        ON CONFLICT (slug) DO NOTHING;
    END LOOP;
END $$;

