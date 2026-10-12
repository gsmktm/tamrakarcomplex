import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync("src/index.css", "utf8");
const root = css.split("  :root {")[1]?.split("  .dark {")[0] ?? "";
const dark = css.split("  .dark {")[1]?.split("\n}\n\n@layer base {")[0] ?? "";

function token(block: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return block.match(new RegExp(`^\\s*${escaped}:\\s*(#[0-9a-fA-F]{6});`, "m"))?.[1];
}

function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map(part => parseInt(part, 16) / 255);
  const [red, green, blue] = channels.map(value =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe("Tamrakar premium brand color design", () => {
  it("keeps the master-branded light surface, primary, gold and action palette", () => {
    expect(token(root, "--background")).toBe("#F5F7FA");
    expect(token(root, "--primary")).toBe("#101C33");
    expect(token(root, "--gold")).toBe("#C49A4A");
    expect(token(root, "--brand-red")).toBe("#DC2626");
  });

  it("keeps readable AA contrast on key light-theme text and CTA combinations", () => {
    const pairs: [string, string][] = [
      ["--foreground", "--background"],
      ["--card-foreground", "--card"],
      ["--muted-foreground", "--card"],
      ["--primary-foreground", "--primary"],
    ];
    for (const [text, surface] of pairs) {
      expect(contrast(token(root, text)!, token(root, surface)!)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast("#FFFFFF", token(root, "--brand-red")!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(root, "--gold-ink")!, token(root, "--card")!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(root, "--gold")!, token(root, "--navy")!)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps readable AA contrast in the dark palette", () => {
    for (const [text, surface] of [
      ["--foreground", "--background"],
      ["--card-foreground", "--card"],
      ["--muted-foreground", "--card"],
      ["--primary-foreground", "--primary"],
    ]) {
      expect(contrast(token(dark, text)!, token(dark, surface)!)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
