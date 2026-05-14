-- Marketplace Unified View
-- Combines Store Inventory (New) and User/Store Listings (Used)

CREATE OR REPLACE VIEW public.unified_marketplace AS
SELECT 
    'inventory' as source_type,
    i.id as original_id,
    i.store_id as store_id,
    NULL::uuid as seller_id,
    m.name || ' ' || COALESCE(v.ram, '') || '/' || COALESCE(v.storage, '') as title,
    m.brand_id as brand_id,
    b.name as brand_name,
    i.model_id as model_id,
    i.variant_id as variant_id,
    i.price as price,
    i.condition as condition,
    i.stock_quantity as stock_quantity,
    m.image as image,
    i.status as status,
    i.created_at as created_at
FROM public.inventory_items i
JOIN public.phone_models m ON i.model_id = m.id
JOIN public.brands b ON m.brand_id = b.id
LEFT JOIN public.phone_variants v ON i.variant_id = v.id

UNION ALL

SELECT 
    'used_listing' as source_type,
    u.id as original_id,
    u.store_id as store_id,
    u.seller_id as seller_id,
    m.name || ' ' || COALESCE(v.ram, '') || '/' || COALESCE(v.storage, '') as title,
    m.brand_id as brand_id,
    b.name as brand_name,
    u.model_id as model_id,
    u.variant_id as variant_id,
    u.expected_price as price,
    u.condition as condition,
    1 as stock_quantity,
    m.image as image,
    u.status as status,
    u.created_at as created_at
FROM public.used_phone_listings u
JOIN public.phone_models m ON u.model_id = m.id
JOIN public.brands b ON m.brand_id = b.id
LEFT JOIN public.phone_variants v ON u.variant_id = v.id;
