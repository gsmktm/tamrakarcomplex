import { supabase } from "@/integrations/supabase/client";

export interface InventoryItem {
  id?: string;
  model_id?: string;
  variant_id?: string;
  store_id: string;
  title?: string;
  slug?: string;
  brand_id?: string;
  brand?: string;
  model?: string;
  storage?: string;
  color?: string;
  price: number;
  stock_quantity: number;
  condition: string;
  warranty?: string;
  status: string;
}

export const inventoryService = {
  async getStoreInventory(storeId: string) {
    const { data, error } = await supabase
      .from('store_products')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async updateInventoryItem(id: string, updates: Partial<InventoryItem>) {
    const { data, error } = await supabase
      .from('store_products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addToInventory(item: InventoryItem) {
    // Check if product already exists in store inventory
    const slug = item.slug || `${item.title || item.model_id || "product"}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    // A model-title slug is not a unique inventory identity: different variants,
    // conditions and individual used devices can share it. Until an approved
    // variant-aware, atomic database operation exists, never merge or reprice.
    const { data: existing, error: lookupError } = await supabase
      .from('store_products')
      .select('id')
      .eq('store_id', item.store_id)
      .eq('slug', slug)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (existing) {
      throw new Error(
        "A product with this listing slug already exists in this store. " +
        "Inventory was not changed. Review the existing listing; " +
        "variant-specific additions require a verified inventory identity."
      );
    }

    const { data, error } = await supabase
      .from('store_products')
      .insert({
        ...item,
        slug,
        title: item.title || item.model_id || "Store product",
        status: item.status || "active",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getMarketplaceListings(filters: { brandId?: string, modelId?: string, condition?: string }) {
    // This fetches store products for the marketplace.
    let query = supabase
      .from('store_products')
      .select('*, store:stores(id, name, slug, logo_url, is_verified)')
      .eq('status', 'active')
      .gt('stock_quantity', 0);

    if (filters.brandId) query = query.eq('brand_id', filters.brandId);
    if (filters.modelId) query = query.eq('model_id', filters.modelId);
    if (filters.condition) query = query.eq('condition', filters.condition);

    const { data, error } = await query.order('price', { ascending: true });
    if (error) throw error;
    return data;
  }
};
