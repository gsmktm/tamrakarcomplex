import type { SectionConfig } from "@/types/app";

/**
 * Resolve homepage section visibility from either the current flat settings
 * map or legacy { sections_control: {...} } payloads.
 * Explicit false always wins; unknown keys and malformed values are ignored.
 */
export function resolveHomepageVisibility(
  sections: readonly Pick<SectionConfig, "key" | "enabled">[],
  settings: unknown,
): Record<string, boolean> {
  const root = settings && typeof settings === "object" && !Array.isArray(settings)
    ? settings as Record<string, unknown>
    : {};

  const legacy = root.sections_control;
  const overrides = legacy && typeof legacy === "object" && !Array.isArray(legacy)
    ? legacy as Record<string, unknown>
    : root;

  return sections.reduce<Record<string, boolean>>((visibility, section) => {
    const value = overrides[section.key];
    visibility[section.key] = typeof value === "boolean" ? value : section.enabled;
    return visibility;
  }, {});
}
