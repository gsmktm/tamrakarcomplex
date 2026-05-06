-- Add listing_type column to sell_listings
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sell_listings' AND column_name = 'listing_type') THEN 
        ALTER TABLE public.sell_listings ADD COLUMN listing_type text DEFAULT 'sell' CHECK (listing_type IN ('sell', 'buy', 'exchange'));
    END IF; 
END $$;
