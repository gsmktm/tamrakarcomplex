import type { ID } from "@/types/common";

export interface Brand {
  id: ID;
  name: string;
  slug: string | null;
  logo_url: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: ID;
  name: string;
  slug: string;
  brand: string | null;
  category: string | null;
  image: string | null;
  price: string | null;
  price_value: number | null;
  in_stock: boolean | null;
  featured: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface PriceListItem {
  id: ID;
  brand: string;
  model: string;
  variant: string | null;
  price: number;
  currency: string | null;
  is_active: boolean | null;
  updated_at: string;
}

/**
 * Form input types for product pages
 */
export interface ProductFormInput {
  name: string;
  slug: string;
  brand?: string;
  category?: string;
  image?: string;
  price?: string;
  price_value?: number;
  in_stock?: boolean;
  featured?: boolean;
}

export interface BrandFormInput {
  name: string;
  slug?: string;
  logo_url?: string;
  is_active?: boolean;
}

export interface PriceListFormInput {
  brand: string;
  model: string;
  variant?: string;
  price: number;
  currency?: string;
  is_active?: boolean;
}
