import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertCmsDraftPublicationReady,
  buildDefaultCmsDraft,
  CMS_UNVERIFIED_DRAFT_MARKER,
} from "@/lib/defaultCmsDraft";

describe("default CMS editorial drafts", () => {
  it.each([
    "Return & Refund Policy",
    "EMI Information",
    "Current Offers",
    "Shipping & Delivery",
    "Warranty & Guarantee",
    "Payment Methods",
    "Privacy Policy",
  ])("does not invent commercial or legal terms for %s", (title) => {
    const html = buildDefaultCmsDraft(title);
    expect(html).toContain(CMS_UNVERIFIED_DRAFT_MARKER);
    expect(html).toContain("not approved for publication");
    expect(html).not.toMatch(/0%|7[-–]10\s+business\s+days|Rs\.?\s*5,?000|same-day delivery|30-day warranty/i);
  });

  it("is wired into CMS saves and keeps new default pages unpublished", () => {
    const source = readFileSync(new URL("../pages/admin/ContentManager.tsx", import.meta.url), "utf8");
    expect(source).toContain("assertCmsDraftPublicationReady(values.content, values.is_published)");
    expect(source).toMatch(/content:\s*buildDefaultCmsDraft\(page\.title \|\| ""\),\s*is_published:\s*false/);
    expect(source).not.toContain("getPageTemplate(");
  });

  it("escapes dynamic headings instead of injecting HTML", () => {
    const html = buildDefaultCmsDraft('<script>alert("x")</script> & Policy');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp; Policy");
  });

  it("blocks publishing an untouched unverified template", () => {
    const html = buildDefaultCmsDraft("Returns");
    expect(() => assertCmsDraftPublicationReady(html, true)).toThrow(/reviewed content/);
    expect(() => assertCmsDraftPublicationReady(html, false)).not.toThrow();
  });

  it("does not interfere with separately reviewed merchant-authored content", () => {
    expect(() => assertCmsDraftPublicationReady("<p>Reviewed merchant-specific text</p>", true)).not.toThrow();
  });
});
