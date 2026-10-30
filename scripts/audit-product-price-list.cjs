#!/usr/bin/env node
/**
 * Read-only audit of checked-in NPR product price-list data.
 * Does NOT infer, fetch, mutate, or publish seller prices or live stock.
 */
const fs = require("node:fs");
const path = require("node:path");

const sourcePath = path.resolve(__dirname, "../src/data/latestMobileBuyingPrices.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const listMarker = "export const LATEST_MOBILE_BUYING_PRICES";
const markerIndex = source.indexOf(listMarker);
const start = source.indexOf("[", markerIndex);
const end = source.indexOf("];", start);
const errors = [];
const warnings = [];

if (markerIndex < 0 || start < 0 || end < 0) {
  errors.push("Catalog export not found or not in the expected static format.");
}

const listSource = errors.length ? "" : source.slice(start + 1, end);
const pattern = /\{\s*brand:\s*"([^"]+)",\s*model:\s*"([^"]+)",\s*price:\s*(-?\d+)(?:,\s*previousPrice:\s*(-?\d+))?\s*\}/g;
const records = [...listSource.matchAll(pattern)];
const rowMarkers = [...listSource.matchAll(/\{\s*brand\s*:/g)].length;

if (rowMarkers !== records.length) {
  errors.push(`Parsed ${records.length} of ${rowMarkers} catalog rows. Review new data format before relying on audit.`);
}
if (records.length === 0) errors.push("No price-list records found.");

const seen = new Set();
for (const match of records) {
  const brand = match[1].trim();
  const model = match[2].trim();
  const price = Number(match[3]);
  const previousPrice = match[4] === undefined ? null : Number(match[4]);
  const key = `${brand.toLocaleLowerCase("en")} / ${model.toLocaleLowerCase("en")}`;

  if (!brand || !model) errors.push(`Missing brand or model: ${key}`);
  if (seen.has(key)) errors.push(`Duplicate brand + model/variant: ${key}`);
  seen.add(key);
  if (!Number.isSafeInteger(price) || price <= 0) errors.push(`Invalid NPR price: ${key}`);
  if (previousPrice !== null) {
    if (!Number.isSafeInteger(previousPrice) || previousPrice <= 0) {
      errors.push(`Invalid comparison price: ${key}`);
    } else if (previousPrice < price) {
      warnings.push(`Price rose vs recorded previous price (not a discount): ${key}. Confirm with merchant.`);
    }
  }
}

const sourceDate = source.match(/supplied on (\d{4}-\d{2}-\d{2})/i)?.[1];
if (sourceDate) {
  const ageDays = Math.floor((Date.now() - new Date(`${sourceDate}T00:00:00Z`).getTime()) / 86_400_000);
  if (Number.isFinite(ageDays) && ageDays > 30) {
    warnings.push(`Reference price list supplied ${sourceDate} (${ageDays} days old). Verify before representing prices as current.`);
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  source: "src/data/latestMobileBuyingPrices.ts",
  recordCount: records.length,
  scope: "static repository price list only; NOT production Supabase/merchant inventory",
  errors,
  warnings,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = errors.length ? 1 : 0;
