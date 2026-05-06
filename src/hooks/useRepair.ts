import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function isSchemaMissingError(error: { code?: string; message?: string } | null) {
  const code = (error?.code as string | undefined) ?? "";
  const message = ((error?.message as string | undefined) ?? "").toLowerCase();
  return (
    code === "PGRST200" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    message.includes("could not find a relationship")
  );
}

// Supabase generated types in this repo may not include the full Repair catalog schema yet.
// Casting keeps the app compiling while still returning strongly-typed data from our adapters.

export interface RepairCategory {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  image: string | null;
  description: string | null;
}

export interface RepairDevice {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  brand: string;
  model_number: string | null;
  image: string | null;
  summary: string | null;
  specifications: Record<string, unknown>;
}

export type RepairDeviceWithCategory = RepairDevice & {
  repair_categories: RepairCategory | null;
};

export interface UnlockDevice {
  id: string;
  brand: string;
  model: string;
  variant: string | null;
  release_year: number;
  supported_features: string[];
  is_premium: boolean;
  created_at: string;
}

export interface UnlockRequest {
  id: string;
  user_id: string | null;
  brand: string;
  model: string;
  service_type: string;
  service_id?: string | null;
  quoted_price_npr?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  imei?: string | null;
  serial_number?: string | null;
  urgency?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string | null;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  assigned_store_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useUnlockCatalog(brand?: string) {
  return useQuery({
    queryKey: ['unlock-catalog', brand],
    queryFn: async () => {
      let query = supabase.from('unlock_catalog').select('*');
      if (brand) {
        query = query.eq('brand', brand);
      }
      const { data, error } = await query.order('model');
      if (error) {
        if (isSchemaMissingError(error)) return [];
        throw error;
      }
      return (data ?? []) as UnlockDevice[];
    }
  });
}

export function useUnlockRequests(userId?: string) {
  return useQuery({
    queryKey: ['unlock-requests', userId],
    queryFn: async () => {
      let query = supabase.from('unlock_requests').select('*');
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        if (isSchemaMissingError(error)) return [];
        throw error;
      }
      return (data ?? []) as UnlockRequest[];
    }
  });
}

export async function createUnlockRequest(request: Omit<UnlockRequest, 'id' | 'created_at' | 'updated_at' | 'status' | 'assigned_store_id'>) {
  const payload = { ...request, status: 'pending' };
  const { data, error } = await supabase.from('unlock_requests').insert([payload]).select().single();
  
  if (error) {
    const message = error.message?.toLowerCase() || "";
    if (message.includes("column") || message.includes("schema cache")) {
      const legacyNotes = [
        request.notes,
        request.service_id ? `Service ID: ${request.service_id}` : null,
        request.quoted_price_npr ? `Quoted Price: Rs. ${request.quoted_price_npr}` : null,
        request.payment_method ? `Payment Method: ${request.payment_method}` : null,
        request.imei ? `IMEI: ${request.imei}` : null,
        request.serial_number ? `Serial/SN: ${request.serial_number}` : null,
        request.urgency ? `Urgency: ${request.urgency}` : null,
      ].filter(Boolean).join("\n");

      const { data: legacyData, error: legacyError } = await supabase.from('unlock_requests').insert([{
        user_id: request.user_id,
        brand: request.brand,
        model: request.model,
        service_type: request.service_type,
        customer_name: request.customer_name,
        customer_phone: request.customer_phone,
        customer_email: request.customer_email,
        notes: legacyNotes || null,
        status: 'pending',
      }]).select().single();

      if (!legacyError) return legacyData as UnlockRequest;
    }
    throw error;
  }
  return data as UnlockRequest;
}

export async function updateUnlockRequestStatus(id: string, status: UnlockRequest['status']) {
  const { data, error } = await supabase.from('unlock_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as UnlockRequest;
}

export function useRepairCategories(parentId: string | null = null) {
  return useQuery({
    queryKey: ['repair-categories', parentId],
    queryFn: async () => {
      let query = supabase.from('repair_categories').select('*');
      if (parentId) {
        query = query.eq('parent_id', parentId);
      } else {
        query = query.is('parent_id', null);
      }
      const { data, error } = await query.order('name');
      if (error) {
        if (isSchemaMissingError(error)) return [];
        throw error;
      }
      return (data ?? []) as RepairCategory[];
    }
  });
}

export function useRepairCategory(slug: string) {
  return useQuery({
    queryKey: ['repair-category', slug],
    queryFn: async () => {
      const { data, error } = await sb
        .from('repair_categories')
        .select(`
          *,
          children:repair_categories!repair_categories_parent_id_fkey(*),
          repair_devices (*)
        `)
        .eq('slug', slug)
        .single();
      if (error) {
        if (isSchemaMissingError(error)) return null;
        throw error;
      }
      return data;
    },
    enabled: !!slug
  });
}

export interface RepairGuide {
  id: string;
  device_id: string;
  title: string;
  slug: string;
  image: string | null;
  summary: string | null;
  difficulty: 'easy' | 'moderate' | 'difficult' | 'very_difficult';
  time_estimate: string | null;
  guide_type: string;
  author: string | null;
}

export interface RepairStep {
  id: string;
  guide_id: string;
  step_number: number;
  title: string | null;
  content: string;
  images: string[];
  video_url: string | null;
}

export interface RepairTool {
  id: string;
  name: string;
  url: string | null;
  image: string | null;
}

export interface RepairPart {
  id: string;
  name: string;
  url: string | null;
  image: string | null;
  estimated_price: number | null;
}

export type RepairGuideFull = RepairGuide & {
  published?: boolean;
  repair_devices: (RepairDeviceWithCategory & { repair_categories: RepairCategory | null }) | null;
  steps: RepairStep[];
  tools: RepairTool[];
  parts: RepairPart[];
};

export function useRepairDevices() {
  return useQuery({
    queryKey: ['repair-devices'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('repair_devices')
        .select('*')
        .order('name');
      if (error) {
        if (isSchemaMissingError(error)) return [];
        throw error;
      }
      return (data ?? []) as RepairDevice[];
    }
  });
}

export function useRepairDevice(slug: string) {
  return useQuery({
    queryKey: ['repair-device', slug],
    queryFn: async () => {
      const { data, error } = await sb
        .from('repair_devices')
        .select(`
          *,
          repair_categories (*)
        `)
        .eq('slug', slug)
        .single();
      if (error) {
        if (isSchemaMissingError(error)) return null;
        throw error;
      }
      return data;
    },
    enabled: !!slug
  });
}

export function useRepairGuides(deviceId?: string) {
  return useQuery({
    queryKey: ['repair-guides', deviceId],
    queryFn: async () => {
      let query = supabase.from('repair_guides').select('*');
      if (deviceId) {
        query = query.eq('device_id', deviceId);
      }
      const { data, error } = await query.order('title');
      if (error) {
        if (isSchemaMissingError(error)) return [];
        throw error;
      }
      return (data ?? []) as RepairGuide[];
    },
    enabled: !!deviceId
  });
}

export function useRepairGuide(slug: string) {
  return useQuery<RepairGuideFull | null>({
    queryKey: ['repair-guide', slug],
    queryFn: async () => {
      const { data: guide, error: guideError } = await sb
        .from('repair_guides')
        .select(`
          *,
          repair_devices (
            *,
            repair_categories (*)
          ),
          repair_steps (*),
          repair_guide_tools (repair_tools (*)),
          repair_guide_parts (repair_parts (*))
        `)
        .eq('slug', slug)
        .single();
      
      if (guideError) {
        if (isSchemaMissingError(guideError)) return null;
        throw guideError;
      }

      if (!guide) return null;
      
      // Flatten the tools and parts
      const guideRecord = guide as Record<string, unknown>;
      const steps = (Array.isArray(guideRecord.repair_steps) ? (guideRecord.repair_steps as RepairStep[]) : [])
        .slice()
        .sort((a, b) => (a.step_number ?? 0) - (b.step_number ?? 0));
      const tools = (Array.isArray(guideRecord.repair_guide_tools) ? (guideRecord.repair_guide_tools as unknown[]) : [])
        .map((gt) => (gt as Record<string, unknown>)?.repair_tools)
        .filter(Boolean) as RepairTool[];
      const parts = (Array.isArray(guideRecord.repair_guide_parts) ? (guideRecord.repair_guide_parts as unknown[]) : [])
        .map((gp) => (gp as Record<string, unknown>)?.repair_parts)
        .filter(Boolean) as RepairPart[];

      return {
        ...guideRecord,
        steps,
        tools,
        parts,
      } as RepairGuideFull;
    },
    enabled: !!slug
  });
}
