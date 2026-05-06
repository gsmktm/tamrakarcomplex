-- Add payout settings to stores
ALTER TABLE stores ADD COLUMN payout_method text;
ALTER TABLE stores ADD COLUMN payout_details jsonb;