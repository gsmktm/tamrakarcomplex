-- Migration: Add auto_merge_catalog_duplicates RPC
-- This function finds duplicates and merges them automatically

CREATE OR REPLACE FUNCTION public.auto_merge_catalog_duplicates()
RETURNS json AS $$
DECLARE
  v_duplicate RECORD;
  v_target_id uuid;
  v_source_ids uuid[];
  v_merged_count integer := 0;
BEGIN
  -- Loop through groups of duplicates found by slug
  FOR v_duplicate IN (
    SELECT slug, array_agg(id ORDER BY created_at ASC) as ids
    FROM public.catalog_products
    GROUP BY slug
    HAVING count(*) > 1
  ) LOOP
    v_target_id := v_duplicate.ids[1];
    v_source_ids := v_duplicate.ids[2:array_length(v_duplicate.ids, 1)];
    
    -- Call the existing merge function
    PERFORM public.merge_catalog_products(v_target_id, v_source_ids);
    
    v_merged_count := v_merged_count + array_length(v_source_ids, 1);
  END LOOP;

  RETURN json_build_object(
    'merged_count', v_merged_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.auto_merge_catalog_duplicates() TO authenticated;
