export type ListingDeliveryMeta = {
  meetup?: boolean;
  home_delivery?: boolean;
  courier?: boolean;
  notes?: string;
};

export type ListingMetaV1 = {
  v: 1;
  subcategory?: string;
  item_details?: string;
  available_date?: string; // ISO string
  hide_precise_location?: boolean;
  location_radius_km?: number;
  delivery?: ListingDeliveryMeta;
  specs?: Record<string, string>;
};

const META_PREFIX = "<!--listing_meta:";
const META_SUFFIX = "-->";

export function encodeListingDescription(text: string, meta: Omit<ListingMetaV1, "v"> | null | undefined) {
  const trimmedText = (text ?? "").trim();
  if (!meta || Object.keys(meta).length === 0) return trimmedText;

  const payload: ListingMetaV1 = { v: 1, ...meta };
  const encoded = encodeURIComponent(JSON.stringify(payload));
  const metaBlock = `${META_PREFIX}${encoded}${META_SUFFIX}`;

  if (!trimmedText) return metaBlock;
  return `${trimmedText}\n\n${metaBlock}`;
}

export function decodeListingDescription(description: string | null | undefined) {
  const raw = description ?? "";
  const start = raw.lastIndexOf(META_PREFIX);
  if (start === -1) return { text: raw, meta: null as ListingMetaV1 | null };

  const end = raw.indexOf(META_SUFFIX, start);
  if (end === -1) return { text: raw, meta: null as ListingMetaV1 | null };

  const encoded = raw.slice(start + META_PREFIX.length, end);
  const before = raw.slice(0, start).trimEnd();

  try {
    const parsed = JSON.parse(decodeURIComponent(encoded)) as ListingMetaV1;
    if (!parsed || parsed.v !== 1) return { text: raw, meta: null as ListingMetaV1 | null };
    return { text: before, meta: parsed };
  } catch {
    return { text: raw, meta: null as ListingMetaV1 | null };
  }
}

export function toCoarseLocation(location: string) {
  const value = (location ?? "").trim();
  if (!value) return "";
  return value.split(",")[0]?.trim() || value;
}

export function formatCondition(condition: string | null | undefined) {
  const normalized = (condition ?? "used").toLowerCase();
  return normalized.replace(/_/g, " ");
}
