import { supabase } from "@/integrations/supabase/client";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  status: string;
  overview_text?: string;
  series_descriptions?: SeriesDescription[];
  service_centers?: ServiceCenter[];
  faq?: FaqItem[];
  country?: string;
  founded_year?: number;
  website?: string;
}

export interface SeriesDescription {
  name: string;
  slug: string;
  description: string;
}

export interface ServiceCenter {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface PhoneSeries {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  status: string;
  description?: string;
  image?: string;
}

export interface PhoneModel {
  id: string;
  brand_id: string;
  series_id?: string;
  name: string;
  slug: string;
  model_number?: string;
  release_year?: number;
  image?: string;
  status: string;
  search_keywords?: string;
  is_featured?: boolean;
  is_upcoming?: boolean;
  is_top_rated?: boolean;
  market_status?: string;
  overview_content?: string;
  launch_date_nepal?: string;
  seo_title?: string;
  seo_description?: string;
}

export interface PhoneVariant {
  id: string;
  model_id: string;
  ram?: string;
  storage?: string;
  color?: string;
  region?: string;
  condition_type: string;
  status: string;
}

export interface PhoneSpec {
  id: string;
  model_id: string;
  display?: string;
  processor?: string;
  camera?: string;
  battery?: string;
  charging?: string;
  os?: string;
  network?: string;
  body?: string;
  pros?: string[];
  cons?: string[];
  verdict?: string;
  highlights?: any;
  full_specs_json?: any;
  key_specs?: any;
  expert_rating?: number;
}

export interface Retailer {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  is_affiliate: boolean;
  status: string;
}

export interface VariantPrice {
  id: string;
  model_id: string;
  variant_id: string;
  retailer_id?: string;
  regular_price: number;
  sale_price?: number;
  currency: string;
  buy_url?: string;
  stock_status: string;
  emi_available: boolean;
  is_default: boolean;
  sort_order: number;
}

export interface ExpertScore {
  id: string;
  model_id: string;
  design_score?: number;
  display_score?: number;
  performance_score?: number;
  software_score?: number;
  camera_score?: number;
  battery_score?: number;
  value_score?: number;
  overall_score?: number;
  review_post_slug?: string;
  verdict?: string;
}

export interface ModelImage {
  id: string;
  model_id: string;
  image_url: string;
  alt_text?: string;
  is_featured: boolean;
  sort_order: number;
}

export interface EmiPlan {
  id: string;
  bank_name: string;
  duration_months: number;
  interest_rate: number;
  processing_fee: number;
  status: string;
}

export interface ModelEmi {
  id: string;
  model_id: string;
  variant_id: string;
  emi_plan_id: string;
  monthly_amount: number;
  down_payment: number;
}

export interface ModelDetail {
  model: PhoneModel & {
    market_status: string;
    is_featured: boolean;
    is_upcoming: boolean;
    overview_content?: string;
    launch_date_nepal?: string;
    seo_title?: string;
    seo_description?: string;
    user_rating_avg: number;
    user_rating_count: number;
    brands?: { name: string; slug: string; logo?: string };
    phone_series?: { name: string; slug: string } | null;
  };
  variants: PhoneVariant[];
  prices: VariantPrice[];
  specs: PhoneSpec | null;
  images: ModelImage[];
  expertScore: ExpertScore | null;
}

export interface CategoryFilter {
  brandSlugs?: string[];
  brand_id?: string;
  minPrice?: number;
  maxPrice?: number;
  market_status?: string;
  is_featured?: boolean;
  is_upcoming?: boolean;
  is_top_rated?: boolean;
  sort?: 'latest' | 'price_asc' | 'price_desc' | 'rating';
  limit?: number;
  offset?: number;
  search?: string;
}

export interface ModelListItem {
  id: string;
  name: string;
  slug: string;
  image?: string;
  market_status: string;
  is_featured: boolean;
  is_upcoming: boolean;
  is_top_rated: boolean;
  release_year?: number;
  brand_name: string;
  brand_slug: string;
  min_price?: number;
  expert_overall?: number;
  // Spec chips for card display
  spec_display?: string;
  spec_processor?: string;
  spec_camera?: string;
  spec_battery?: string;
  // Variants summary (e.g. "8GB / 128GB / 256GB")
  ram_options?: string[];
  storage_options?: string[];
}

export interface BrandDetail extends Brand {
  models: ModelListItem[];
  series: PhoneSeries[];
  total_models: number;
}

export const mobileMasterService = {
  // ── Brands ───────────────────────────────────────────────────
  async getBrands() {
    const { data, error } = await supabase.from("brands").select("*").eq("status", "active").order("name");
    if (error) throw error;
    return data as Brand[];
  },

  async getAllBrands() {
    const { data, error } = await supabase.from("brands").select("*").order("name");
    if (error) throw error;
    return data as Brand[];
  },

  async getBrandBySlug(slug: string): Promise<Brand | null> {
    const { data, error } = await supabase.from("brands").select("*").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return data as Brand | null;
  },

  async createBrand(brand: Partial<Brand>) {
    const { data, error } = await supabase.from("brands").insert(brand).select().single();
    if (error) throw error;
    return data;
  },
  async updateBrand(id: string, brand: Partial<Brand>) {
    const { data, error } = await supabase.from("brands").update(brand).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async deleteBrand(id: string) {
    const { error } = await supabase.from("brands").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Brand Detail page (brand + models + series) ───────────────
  async getBrandDetail(brandSlug: string): Promise<BrandDetail | null> {
    const brand = await mobileMasterService.getBrandBySlug(brandSlug);
    if (!brand) return null;

    const [modelsResult, seriesResult] = await Promise.all([
      mobileMasterService.getModelList({ brand_id: brand.id }),
      mobileMasterService.getSeriesByBrand(brand.id),
    ]);

    return {
      ...brand,
      models: modelsResult.items,
      series: (seriesResult ?? []) as PhoneSeries[],
      total_models: modelsResult.total,
    };
  },

  // ── Series ────────────────────────────────────────────────────
  async getSeriesByBrand(brandId: string) {
    const { data, error } = await supabase.from("phone_series").select("*").eq("brand_id", brandId).order("name");
    if (error) throw error;
    return data as PhoneSeries[];
  },
  async createSeries(series: Partial<PhoneSeries>) {
    const { data, error } = await supabase.from("phone_series").insert(series).select().single();
    if (error) throw error;
    return data;
  },
  async updateSeries(id: string, series: Partial<PhoneSeries>) {
    const { data, error } = await supabase.from("phone_series").update(series).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async deleteSeries(id: string) {
    const { error } = await supabase.from("phone_series").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Variants ─────────────────────────────────────────────────
  async getVariants(modelId: string) {
    const { data, error } = await supabase
      .from('phone_variants')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as PhoneVariant[];
  },
  async createVariant(variant: Partial<PhoneVariant>) {
    const { data, error } = await supabase.from('phone_variants').insert(variant).select().single();
    if (error) throw error;
    return data;
  },
  async deleteVariant(id: string) {
    const { error } = await supabase.from('phone_variants').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Models ────────────────────────────────────────────────────
  async getModels(brandId?: string, seriesId?: string) {
    let query = supabase.from("phone_models").select("*, brands(name), phone_series(name)");
    if (brandId) query = query.eq("brand_id", brandId);
    if (seriesId) query = query.eq("series_id", seriesId);
    const { data, error } = await query.order("name");
    if (error) throw error;
    return data;
  },
  async searchModels(searchTerm: string) {
    const { data, error } = await supabase
      .from("phone_models")
      .select("*, brands(name)")
      .ilike("name", `%${searchTerm}%`)
      .limit(10);
    if (error) throw error;
    return data;
  },
  async createModel(model: Partial<PhoneModel>) {
    const { data, error } = await supabase.from("phone_models").insert(model).select().single();
    if (error) throw error;
    return data;
  },
  async updateModel(id: string, model: Partial<PhoneModel>) {
    const { data, error } = await supabase.from("phone_models").update(model).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async deleteModel(id: string) {
    const { error } = await supabase.from("phone_models").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Specs ─────────────────────────────────────────────────────
  async getSpecs(modelId: string) {
    const { data, error } = await supabase.from("phone_specs").select("*").eq("model_id", modelId).maybeSingle();
    if (error) throw error;
    return data as PhoneSpec | null;
  },
  async upsertSpecs(specs: Partial<PhoneSpec>) {
    const { data, error } = await supabase.from("phone_specs").upsert(specs, { onConflict: 'model_id' }).select().single();
    if (error) throw error;
    return data as PhoneSpec;
  },

  // ── Legacy module helpers ─────────────────────────────────────
  async updateInventory(item: any) {
    const { data, error } = await supabase.from("inventory_items").upsert(item).select().single();
    if (error) throw error;
    return data;
  },
  async updateExchangeValue(value: any) {
    const { data, error } = await supabase.from("exchange_values").upsert(value).select().single();
    if (error) throw error;
    return data;
  },
  async updateRepairService(service: any) {
    const { data, error } = await supabase.from("repair_services").upsert(service).select().single();
    if (error) throw error;
    return data;
  },
  async updateUnlockingService(service: any) {
    const { data, error } = await supabase.from("unlocking_services").upsert(service).select().single();
    if (error) throw error;
    return data;
  },

  // ── Prices ────────────────────────────────────────────────────
  async getVariantPrices(modelId: string): Promise<VariantPrice[]> {
    const { data, error } = await supabase
      .from('phone_variant_prices')
      .select('*')
      .eq('model_id', modelId)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []) as VariantPrice[];
  },
  async upsertVariantPrice(price: Partial<VariantPrice>): Promise<VariantPrice> {
    const { data, error } = await supabase.from('phone_variant_prices').upsert(price).select().single();
    if (error) throw error;
    return data as VariantPrice;
  },
  async deleteVariantPrice(id: string): Promise<void> {
    const { error } = await supabase.from('phone_variant_prices').delete().eq('id', id);
    if (error) throw error;
  },
  async getPriceHistory(modelId: string, limit = 20) {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  // ── Expert Score ─────────────────────────────────────────────
  async getExpertScore(modelId: string): Promise<ExpertScore | null> {
    const { data, error } = await supabase.from('expert_scores').select('*').eq('model_id', modelId).maybeSingle();
    if (error) throw error;
    return data as ExpertScore | null;
  },
  async upsertExpertScore(score: Partial<ExpertScore>): Promise<ExpertScore> {
    const { data, error } = await supabase.from('expert_scores').upsert(score, { onConflict: 'model_id' }).select().single();
    if (error) throw error;
    return data as ExpertScore;
  },

  // ── Model Images ─────────────────────────────────────────────
  async getModelImages(modelId: string): Promise<ModelImage[]> {
    const { data, error } = await supabase.from('model_images').select('*').eq('model_id', modelId).order('sort_order');
    if (error) throw error;
    return (data ?? []) as ModelImage[];
  },
  async addModelImage(image: Partial<ModelImage>): Promise<ModelImage> {
    const { data, error } = await supabase.from('model_images').insert(image).select().single();
    if (error) throw error;
    return data as ModelImage;
  },
  async deleteModelImage(id: string): Promise<void> {
    const { error } = await supabase.from('model_images').delete().eq('id', id);
    if (error) throw error;
  },
  async updateModelImage(id: string, updates: Partial<ModelImage>): Promise<void> {
    const { error } = await supabase.from('model_images').update(updates).eq('id', id);
    if (error) throw error;
  },

  // ── EMI Plans ────────────────────────────────────────────────
  async getEmiPlans(): Promise<EmiPlan[]> {
    const { data, error } = await supabase.from('emi_plans').select('*').eq('status', 'active').order('bank_name');
    if (error) throw error;
    return (data ?? []) as EmiPlan[];
  },
  async getAllEmiPlans(): Promise<EmiPlan[]> {
    const { data, error } = await supabase.from('emi_plans').select('*').order('bank_name');
    if (error) throw error;
    return (data ?? []) as EmiPlan[];
  },
  async upsertEmiPlan(plan: Partial<EmiPlan>): Promise<EmiPlan> {
    const { data, error } = await supabase.from('emi_plans').upsert(plan).select().single();
    if (error) throw error;
    return data as EmiPlan;
  },
  async deleteEmiPlan(id: string): Promise<void> {
    const { error } = await supabase.from('emi_plans').delete().eq('id', id);
    if (error) throw error;
  },
  async getModelEmi(modelId: string): Promise<ModelEmi[]> {
    const { data, error } = await supabase.from('model_emi').select('*').eq('model_id', modelId);
    if (error) throw error;
    return (data ?? []) as ModelEmi[];
  },
  async upsertModelEmi(emi: Partial<ModelEmi>): Promise<ModelEmi> {
    const { data, error } = await supabase.from('model_emi').upsert(emi).select().single();
    if (error) throw error;
    return data as ModelEmi;
  },
  async deleteModelEmi(id: string): Promise<void> {
    const { error } = await supabase.from('model_emi').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Model Detail (full JOIN for public pages) ────────────────
  async getModelDetail(slug: string): Promise<ModelDetail | null> {
    const { data: model, error: mErr } = await supabase
      .from('phone_models')
      .select('*, brands(name, slug, logo), phone_series(name, slug)')
      .eq('slug', slug)
      .maybeSingle();
    if (mErr) throw mErr;
    if (!model) return null;

    const [variants, prices, specs, images, expertScore] = await Promise.all([
      supabase.from('phone_variants').select('*').eq('model_id', model.id),
      supabase.from('phone_variant_prices').select('*').eq('model_id', model.id).order('sort_order'),
      supabase.from('phone_specs').select('*').eq('model_id', model.id).maybeSingle(),
      supabase.from('model_images').select('*').eq('model_id', model.id).order('sort_order'),
      supabase.from('expert_scores').select('*').eq('model_id', model.id).maybeSingle(),
    ]);

    if (variants.error) throw variants.error;
    if (prices.error) throw prices.error;
    if (specs.error) throw specs.error;
    if (images.error) throw images.error;
    if (expertScore.error) throw expertScore.error;

    return {
      model: model as ModelDetail['model'],
      variants: (variants.data ?? []) as PhoneVariant[],
      prices: (prices.data ?? []) as VariantPrice[],
      specs: (specs.data ?? null) as PhoneSpec | null,
      images: (images.data ?? []) as ModelImage[],
      expertScore: (expertScore.data ?? null) as ExpertScore | null,
    };
  },

  // ── Category / Brand listing ─────────────────────────────────
  async getModelList(filters: CategoryFilter = {}): Promise<{ items: ModelListItem[]; total: number }> {
    let query = supabase
      .from('phone_models')
      .select(
        'id, name, slug, image, market_status, is_featured, is_upcoming, is_top_rated, release_year, brand_id, brands(name, slug)',
        { count: 'exact' }
      );

    query = query.eq('status', 'active');
    if (filters.market_status) query = query.eq('market_status', filters.market_status);
    if (filters.is_featured) query = query.eq('is_featured', true);
    if (filters.is_upcoming) query = query.eq('is_upcoming', true);
    if (filters.is_top_rated) query = query.eq('is_top_rated', true);
    if (filters.brand_id) query = query.eq('brand_id', filters.brand_id);
    if (filters.search) query = query.ilike('name', `%${filters.search}%`);

    if (filters.sort !== 'price_asc' && filters.sort !== 'price_desc') {
      query = query.order('created_at', { ascending: false });
    }
    if (filters.limit) query = query.range(filters.offset ?? 0, (filters.offset ?? 0) + filters.limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const modelIds = (data ?? []).map((m: any) => m.id);

    // Parallel: prices + specs + expert scores + variants
    const [priceRows, specRows, expertRows, variantRows] = await Promise.all([
      modelIds.length > 0
        ? supabase.from('phone_variant_prices').select('model_id, regular_price').in('model_id', modelIds).eq('stock_status', 'in_stock')
        : { data: [], error: null },
      modelIds.length > 0
        ? supabase.from('phone_specs').select('model_id, display, processor, camera, battery').in('model_id', modelIds)
        : { data: [], error: null },
      modelIds.length > 0
        ? supabase.from('expert_scores').select('model_id, overall_score').in('model_id', modelIds)
        : { data: [], error: null },
      modelIds.length > 0
        ? supabase.from('phone_variants').select('model_id, ram, storage').in('model_id', modelIds).eq('status', 'active')
        : { data: [], error: null },
    ]);

    // Build lookup maps
    const minPriceMap: Record<string, number> = {};
    for (const row of (priceRows.data ?? [])) {
      const existing = minPriceMap[row.model_id];
      if (!(row.model_id in minPriceMap) || row.regular_price < existing) minPriceMap[row.model_id] = row.regular_price;
    }

    const specMap: Record<string, any> = {};
    for (const s of (specRows.data ?? [])) specMap[s.model_id] = s;

    const expertMap: Record<string, number> = {};
    for (const e of (expertRows.data ?? [])) if (e.overall_score) expertMap[e.model_id] = e.overall_score;

    const ramMap: Record<string, Set<string>> = {};
    const storageMap: Record<string, Set<string>> = {};
    for (const v of (variantRows.data ?? [])) {
      if (v.ram) { if (!ramMap[v.model_id]) ramMap[v.model_id] = new Set(); ramMap[v.model_id].add(v.ram); }
      if (v.storage) { if (!storageMap[v.model_id]) storageMap[v.model_id] = new Set(); storageMap[v.model_id].add(v.storage); }
    }

    let items: ModelListItem[] = (data ?? []).map((m: any) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      image: m.image,
      market_status: m.market_status ?? 'available',
      is_featured: m.is_featured ?? false,
      is_upcoming: m.is_upcoming ?? false,
      is_top_rated: m.is_top_rated ?? false,
      release_year: m.release_year,
      brand_name: m.brands?.name ?? '',
      brand_slug: m.brands?.slug ?? '',
      min_price: minPriceMap[m.id],
      expert_overall: expertMap[m.id],
      spec_display: specMap[m.id]?.display,
      spec_processor: specMap[m.id]?.processor,
      spec_camera: specMap[m.id]?.camera,
      spec_battery: specMap[m.id]?.battery,
      ram_options: ramMap[m.id] ? Array.from(ramMap[m.id]) : undefined,
      storage_options: storageMap[m.id] ? Array.from(storageMap[m.id]) : undefined,
    }));

    // Price filter (post-fetch since price is in separate table)
    if (filters.minPrice !== undefined) items = items.filter(i => (i.min_price ?? 0) >= filters.minPrice!);
    if (filters.maxPrice) items = items.filter(i => i.min_price !== undefined && i.min_price <= filters.maxPrice!);

    if (filters.sort === 'price_asc') {
      items.sort((a, b) => (a.min_price ?? Infinity) - (b.min_price ?? Infinity));
    } else if (filters.sort === 'price_desc') {
      items.sort((a, b) => (b.min_price ?? -Infinity) - (a.min_price ?? -Infinity));
    } else if (filters.sort === 'rating') {
      items.sort((a, b) => (b.expert_overall ?? 0) - (a.expert_overall ?? 0));
    }

    return { items, total: count ?? 0 };
  },

  async getRetailers(): Promise<Retailer[]> {
    const { data, error } = await supabase.from('retailers').select('*').eq('status', 'active').order('name');
    if (error) throw error;
    return (data ?? []) as Retailer[];
  },
};
