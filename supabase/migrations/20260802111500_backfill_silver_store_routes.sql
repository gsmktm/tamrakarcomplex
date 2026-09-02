-- Persist the same canonical slugs used by the public directory so detail
-- routes and admin preview links resolve database records instead of seeds.

UPDATE public.stores
SET slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g')),
    seo_slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g')),
    updated_at = now()
WHERE name = ANY(ARRAY[
  'Smart Phone Gallery', 'Smart Watch Gallery', 'Smart Zone', 'Subha Central Mobile',
  'Talk & Me', 'Tamrakar Laptop Zone', 'Tamrakar Mobile', 'Tamrakar Mobile Hub',
  'Tamrakar Official Store', 'TATHAASTU', 'Tele World', 'The Cellular Point',
  'The Cloud Store', 'The Mobile Repair', 'Tirupati Mobile Center'
]::text[]);

DO $$
DECLARE
  v_routable_count integer;
BEGIN
  SELECT count(*) INTO v_routable_count
  FROM public.stores
  WHERE name = ANY(ARRAY[
    'Smart Phone Gallery', 'Smart Watch Gallery', 'Smart Zone', 'Subha Central Mobile',
    'Talk & Me', 'Tamrakar Laptop Zone', 'Tamrakar Mobile', 'Tamrakar Mobile Hub',
    'Tamrakar Official Store', 'TATHAASTU', 'Tele World', 'The Cellular Point',
    'The Cloud Store', 'The Mobile Repair', 'Tirupati Mobile Center'
  ]::text[])
    AND slug IS NOT NULL
    AND seo_slug = slug;

  IF v_routable_count <> 15 THEN
    RAISE EXCEPTION 'Expected 15 routable Silver stores, found %', v_routable_count;
  END IF;
END;
$$;
