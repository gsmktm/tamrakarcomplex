-- Add store_id to sell_listings for store-based listings
ALTER TABLE sell_listings ADD COLUMN store_id uuid REFERENCES stores(id);

-- Update orders and payouts to link to store via sell_listings.store_id
-- But since payouts not exist, note for future