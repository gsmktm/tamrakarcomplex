import type { ID, JsonValue } from "@/types/common";

export interface SystemSetting {
  id: ID;
  key: string;
  value: JsonValue;
  category: string;
  description: string | null;
  is_public: boolean;
  updated_by: ID | null;
  created_at: string;
  updated_at: string;
}

/**
 * Form input types for settings pages
 */
export interface SystemSettingFormInput {
  key: string;
  value: JsonValue;
  category: string;
  description?: string;
  is_public: boolean;
}
