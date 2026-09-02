-- The selected Silver upgrades must be public records so the directory uses
-- their canonical database package instead of local Basic fallback entries.

UPDATE public.stores
SET is_active = true,
    public_status = 'published',
    updated_at = now()
WHERE name = ANY(ARRAY[
  'Smart Phone Gallery',
  'Smart Watch Gallery',
  'Smart Zone',
  'Subha Central Mobile',
  'Talk & Me',
  'Tamrakar Laptop Zone',
  'Tamrakar Mobile',
  'Tamrakar Mobile Hub',
  'Tamrakar Official Store',
  'TATHAASTU',
  'Tele World',
  'The Cellular Point',
  'The Cloud Store',
  'The Mobile Repair',
  'Tirupati Mobile Center'
]::text[]);

DO $$
DECLARE
  v_visible_silver_count integer;
BEGIN
  SELECT count(*) INTO v_visible_silver_count
  FROM public.stores s
  JOIN public.store_packages sp ON sp.id = s.package_id
  WHERE s.name = ANY(ARRAY[
    'Smart Phone Gallery', 'Smart Watch Gallery', 'Smart Zone', 'Subha Central Mobile',
    'Talk & Me', 'Tamrakar Laptop Zone', 'Tamrakar Mobile', 'Tamrakar Mobile Hub',
    'Tamrakar Official Store', 'TATHAASTU', 'Tele World', 'The Cellular Point',
    'The Cloud Store', 'The Mobile Repair', 'Tirupati Mobile Center'
  ]::text[])
    AND sp.slug = 'silver'
    AND s.is_active = true
    AND s.public_status = 'published'
    AND s.subscription_status = 'active'
    AND s.subscription_end_date > now();

  IF v_visible_silver_count <> 15 THEN
    RAISE EXCEPTION 'Expected 15 public active Silver stores, found %', v_visible_silver_count;
  END IF;
END;
$$;
