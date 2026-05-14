import { supabase } from "@/integrations/supabase/client";
import { getPublicStorePath } from "@/lib/storeRoutes";

export type SearchResultType = 'product' | 'store' | 'service' | 'model';

export interface UnifiedSearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  image?: string;
  link: string;
  price?: number;
  category?: string;
}

export const unifiedSearchService = {
  async search(query: string): Promise<UnifiedSearchResult[]> {
    if (!query || query.length < 2) return [];

    const results: UnifiedSearchResult[] = [];

    // 1. Search Stores
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name, slug, seo_slug, logo_url, shop_no, location')
      .or(`name.ilike.%${query}%,shop_no.ilike.%${query}%`)
      .eq('status', 'active')
      .limit(5);

    if (stores) {
      stores.forEach(s => {
        results.push({
          id: s.id,
          type: 'store',
          title: s.name,
          subtitle: `Shop ${s.shop_no} · ${s.location}`,
          image: s.logo_url || undefined,
          link: getPublicStorePath(s)
        });
      });
    }

    // 2. Search Phone Models (Catalog)
    const { data: models } = await supabase
      .from('phone_models')
      .select('id, name, slug, image, brands(name)')
      .ilike('name', `%${query}%`)
      .eq('status', 'active')
      .limit(5);

    if (models) {
      models.forEach(m => {
        results.push({
          id: m.id,
          type: 'model',
          title: m.name,
          subtitle: (m.brands as any)?.name || 'Mobile Phone',
          image: m.image || undefined,
          link: `/mobile/${m.slug || m.id}`
        });
      });
    }

    // 3. Search active store products
    const { data: inventory } = await supabase
      .from('store_products')
      .select('id, title, slug, price, discount_price, images, brand, model, store:stores(name)')
      .or(`title.ilike.%${query}%,brand.ilike.%${query}%,model.ilike.%${query}%`)
      .eq('status', 'active')
      .gt('stock_quantity', 0)
      .limit(5);

    if (inventory) {
      inventory.forEach(i => {
        const store = i.store as any;
        const images = Array.isArray(i.images) ? i.images : [];
        results.push({
          id: i.id,
          type: 'product',
          title: i.title || [i.brand, i.model].filter(Boolean).join(" ") || 'Product',
          subtitle: `Available at ${store?.name}`,
          image: images[0] || undefined,
          price: i.discount_price ?? i.price,
          link: `/marketplace/listing/${i.id}`
        });
      });
    }

    return results;
  }
};
