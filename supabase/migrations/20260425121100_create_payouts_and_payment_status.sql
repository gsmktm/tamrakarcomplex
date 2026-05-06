-- Create payouts table for store commissions and payouts
CREATE TABLE payouts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid REFERENCES stores(id) NOT NULL,
  order_id uuid REFERENCES orders(id),
  sell_listing_id uuid REFERENCES sell_listings(id),
  amount decimal(10,2) NOT NULL,
  commission_rate decimal(5,2) DEFAULT 10.00,
  commission_amount decimal(10,2) NOT NULL,
  payout_amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid', 'failed')),
  payout_method text,
  payout_details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone
);

-- Update orders to include payment_status
ALTER TABLE orders ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));