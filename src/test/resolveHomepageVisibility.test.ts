import { describe, expect, it } from "vitest";
import { resolveHomepageVisibility } from "@/lib/resolveHomepageVisibility";

const sections = [
  { key: "hero", enabled: true },
  { key: "offers", enabled: true },
  { key: "phone_finder", enabled: false },
];

describe("resolveHomepageVisibility", () => {
  it("honors a flat CMS visibility map", () => {
    expect(resolveHomepageVisibility(sections, { hero: false, offers: true, phone_finder: true }))
      .toEqual({ hero: false, offers: true, phone_finder: true });
  });

  it("honors older nested sections_control settings", () => {
    expect(resolveHomepageVisibility(sections, { sections_control: { offers: false } }))
      .toEqual({ hero: true, offers: false, phone_finder: false });
  });

  it("preserves defaults for unknown and invalid settings", () => {
    expect(resolveHomepageVisibility(sections, { offers: "false", other: false }))
      .toEqual({ hero: true, offers: true, phone_finder: false });
    expect(resolveHomepageVisibility(sections, null))
      .toEqual({ hero: true, offers: true, phone_finder: false });
  });
});
