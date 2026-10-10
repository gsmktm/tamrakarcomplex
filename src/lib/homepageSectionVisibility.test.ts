import { describe, expect, it } from "vitest";
import { resolveHomepageSections } from "./homepageSectionVisibility";

describe("homepage section visibility", () => {
  it("shows default sections even when settings are missing", () => {
    const sections = resolveHomepageSections(null);
    expect(sections.hero).toBe(true);
    expect(sections.offers).toBe(true);
    expect(sections.price_finder).toBe(true);
    expect(sections.marketplace_feed).toBe(true);
  });
  it("preserves intentional administrator-disabled flags", () => {
    const sections = resolveHomepageSections({ featured: false, hero: true });
    expect(sections.featured).toBe(false);
    expect(sections.hero).toBe(true);
    expect(sections.repair_form).toBe(true);
  });
  it("reads nested sections_control settings", () => {
    const sections = resolveHomepageSections({ sections_control: { offers: false, trust_stats: { enabled: false } } });
    expect(sections.offers).toBe(false);
    expect(sections.trust_stats).toBe(false);
    expect(sections.featured).toBe(true);
  });
  it("gives server values priority over theme defaults", () => {
    const sections = resolveHomepageSections({ hero: false }, [{ key: "hero", enabled: true }]);
    expect(sections.hero).toBe(false);
  });
  it("ignores malformed settings", () => {
    const sections = resolveHomepageSections({ offers: "false", sections_control: [] });
    expect(sections.offers).toBe(true);
  });
});
