import servicesCsv from "./unlocking_services_export.csv?raw";

export type UnlockingServiceCategory =
  | "iPhone Network Unlock"
  | "Samsung FRP"
  | "Carrier Check"
  | "MDM / ID Remove"
  | "iCloud Bypass Tool"
  | "IMEI / Unbarring";

export interface UnlockingServiceOffer {
  id: string;
  category: UnlockingServiceCategory;
  name: string;
  creditPrice: number;
  estimatedNpr: number;
  turnaround: string;
  requirements: string[];
  tags: string[];
  riskNote?: string;
}

const CREDIT_TO_NPR = 165;

function npr(credit: number) {
  return Math.round(credit * CREDIT_TO_NPR);
}

export const UNLOCKING_SERVICE_OFFERS: UnlockingServiceOffer[] = [
  {
    id: "iphone-us-flex-clean",
    category: "iPhone Network Unlock",
    name: "US Reseller Flex Policy iPhone Unlock",
    creditPrice: 18,
    estimatedNpr: npr(18),
    turnaround: "Fast service",
    requirements: ["IMEI", "Clean / eligible status", "iPhone model"],
    tags: ["iPhone", "Network Unlock", "Clean IMEI"],
  },
  {
    id: "iphone-flex-premium-24-48",
    category: "iPhone Network Unlock",
    name: "USA Reseller Flex Network Unlock Premium",
    creditPrice: 130,
    estimatedNpr: npr(130),
    turnaround: "24-48 hours",
    requirements: ["IMEI", "Carrier status", "No lost/stolen flag"],
    tags: ["iPhone", "Premium", "All Models"],
  },
  {
    id: "sprint-tmobile-15-16",
    category: "iPhone Network Unlock",
    name: "Sprint / T-Mobile iPhone 15-16 Unlock",
    creditPrice: 44,
    estimatedNpr: npr(44),
    turnaround: "Eligibility based",
    requirements: ["IMEI", "Fully paid status", "Clean eligibility"],
    tags: ["iPhone", "Sprint", "T-Mobile"],
  },
  {
    id: "verizon-all-model-clean",
    category: "iPhone Network Unlock",
    name: "USA Verizon iPhone Clean Eligible Unlock",
    creditPrice: 82,
    estimatedNpr: npr(82),
    turnaround: "Eligibility based",
    requirements: ["IMEI", "Purchased over 60 days", "Clean Verizon status"],
    tags: ["iPhone", "Verizon", "No Relock Warranty"],
  },
  {
    id: "samsung-frp-android-14",
    category: "Samsung FRP",
    name: "Samsung FRP Remove Android 14 Supported",
    creditPrice: 14.95,
    estimatedNpr: npr(14.95),
    turnaround: "Technician confirmation",
    requirements: ["Model number", "Android version", "Device in hand"],
    tags: ["Samsung", "FRP", "Android 14"],
  },
  {
    id: "sprint-tmobile-eligibility-check",
    category: "Carrier Check",
    name: "Sprint / T-Mobile / US Cellular Eligibility Check",
    creditPrice: 0.08,
    estimatedNpr: npr(0.08),
    turnaround: "Instant / quick check",
    requirements: ["IMEI"],
    tags: ["Check", "Carrier", "Eligibility"],
  },
  {
    id: "spectrum-eligibility-check",
    category: "Carrier Check",
    name: "Spectrum USA Unlock Eligibility Check",
    creditPrice: 0.15,
    estimatedNpr: npr(0.15),
    turnaround: "Instant / quick check",
    requirements: ["IMEI"],
    tags: ["Check", "Spectrum", "Eligibility"],
  },
  {
    id: "tecno-infinix-itel-mdm-premium",
    category: "MDM / ID Remove",
    name: "Tecno / iTel / Infinix MDM Remove Permanent",
    creditPrice: 16.69,
    estimatedNpr: npr(16.69),
    turnaround: "6-12 hours",
    requirements: ["IMEI or serial", "Brand/model", "MDM lock photo"],
    tags: ["Tecno", "iTel", "Infinix", "MDM"],
  },
  {
    id: "tecno-infinix-itel-id-remove",
    category: "MDM / ID Remove",
    name: "Tecno / Infinix / iTel Cloud ID Removal",
    creditPrice: 9.5,
    estimatedNpr: npr(9.5),
    turnaround: "Technician confirmation",
    requirements: ["IMEI or serial", "Model", "Lock screen photo"],
    tags: ["Cloud ID", "Android", "Activation"],
  },
  {
    id: "a12-lu-wifi-bypass",
    category: "iCloud Bypass Tool",
    name: "LU-WIFI A12+ Bypass - iPhone / iPad",
    creditPrice: 1.3,
    estimatedNpr: npr(1.3),
    turnaround: "Tool-based",
    requirements: ["Serial / ECID if needed", "iOS version", "Device model"],
    tags: ["A12+", "Bypass", "iPhone", "iPad"],
    riskNote: "Signal support depends on service type and device state.",
  },
  {
    id: "a12-iremoval-pro",
    category: "iCloud Bypass Tool",
    name: "iRemoval PRO A12+ Bypass",
    creditPrice: 6,
    estimatedNpr: npr(6),
    turnaround: "Tool-based",
    requirements: ["Device model", "iOS version", "Serial / ECID if needed"],
    tags: ["A12+", "iRemoval", "iOS"],
    riskNote: "Final compatibility must be verified before payment approval.",
  },
  {
    id: "lpro-iphone-x-signal",
    category: "iCloud Bypass Tool",
    name: "LPro Max iPhone X Bypass With Signal",
    creditPrice: 26.5,
    estimatedNpr: npr(26.5),
    turnaround: "Mac / Windows tool",
    requirements: ["iPhone X", "iOS version", "Device inspection"],
    tags: ["iPhone X", "Signal", "Bypass"],
  },
  {
    id: "tmobile-unbarring-premium",
    category: "IMEI / Unbarring",
    name: "T-Mobile USA iPhone Unbarring Premium",
    creditPrice: 42.5,
    estimatedNpr: npr(42.5),
    turnaround: "Status based",
    requirements: ["IMEI", "Blacklist status", "Carrier check"],
    tags: ["IMEI", "Unbarring", "T-Mobile"],
    riskNote: "Approval depends on IMEI status and supplier verification.",
  },
  {
    id: "verizon-unbarring-generic",
    category: "IMEI / Unbarring",
    name: "Verizon iPhone / Generic Unbarring",
    creditPrice: 49,
    estimatedNpr: npr(49),
    turnaround: "Status based",
    requirements: ["IMEI", "Lost/stolen status check", "Model"],
    tags: ["IMEI", "Verizon", "Unbarring"],
  },
];

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function inferCategory(category: string, name: string): UnlockingServiceCategory {
  const text = `${category} ${name}`.toLowerCase();
  if (text.includes("frp")) return "Samsung FRP";
  if (text.includes("mdm") || text.includes("id remove") || text.includes("activation code")) return "MDM / ID Remove";
  if (text.includes("bypass") || text.includes("iremoval") || text.includes("lpro") || text.includes("a12")) return "iCloud Bypass Tool";
  if (text.includes("unbarring") || text.includes("bad imei") || text.includes("cleaning")) return "IMEI / Unbarring";
  if (text.includes("check") || text.includes("eligibility") || text.includes("status")) return "Carrier Check";
  return "iPhone Network Unlock";
}

function inferRequirements(category: UnlockingServiceCategory, name: string) {
  const text = name.toLowerCase();
  if (category === "Carrier Check") return ["IMEI", "Carrier / country if known"];
  if (category === "Samsung FRP") return ["Samsung model", "Android version", "Device lock photo"];
  if (category === "MDM / ID Remove") return ["IMEI or serial", "Brand/model", "MDM or ID lock photo"];
  if (category === "iCloud Bypass Tool") return ["Device model", "iOS version", "Serial / ECID if required"];
  if (category === "IMEI / Unbarring") return ["IMEI", "Blacklist / lost status", "Carrier check first"];
  if (text.includes("verizon")) return ["IMEI", "Clean eligible Verizon status", "Purchased over 60 days"];
  if (text.includes("sprint") || text.includes("t-mobile")) return ["IMEI", "Fully paid / eligible status", "No lost or stolen flag"];
  return ["IMEI", "Carrier status", "Exact iPhone model"];
}

function inferTurnaround(name: string) {
  const text = name.toLowerCase();
  const hourMatch = name.match(/(\d+\s*[-–]\s*\d+\s*h(?:ours?)?|\d+\s*h(?:ours?)?)/i);
  if (hourMatch) return hourMatch[1].replace(/\s+/g, " ");
  if (text.includes("instant")) return "Instant / quick";
  if (text.includes("24") || text.includes("48")) return "24-48 hours";
  if (text.includes("72")) return "24-72 hours";
  if (text.includes("verify") || text.includes("eligible")) return "Eligibility based";
  return "Staff verification";
}

function inferTags(category: string, name: string) {
  const tags = new Set<string>();
  const text = `${category} ${name}`.toLowerCase();
  [
    "iPhone",
    "Samsung",
    "Verizon",
    "T-Mobile",
    "Sprint",
    "Spectrum",
    "AT&T",
    "Tecno",
    "Infinix",
    "iTel",
    "Honor",
    "MDM",
    "FRP",
    "IMEI",
    "Bypass",
    "Check",
    "Unlock",
  ].forEach((tag) => {
    if (text.includes(tag.toLowerCase())) tags.add(tag);
  });
  if (tags.size === 0) tags.add("Unlocking");
  return Array.from(tags).slice(0, 6);
}

function csvToOffers(csv: string): UnlockingServiceOffer[] {
  return csv
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawCategory, rawName, rawCredit, rawId] = parseCsvLine(line);
      const name = rawName.replace(/\s+-\s+[\d.]+\s+Credit.*$/i, "").replace(/\s+\*New$/i, "").trim();
      const creditPrice = Number(rawCredit) || 0;
      const category = inferCategory(rawCategory, name);
      return {
        id: rawId || `${rawCategory}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        category,
        name,
        creditPrice,
        estimatedNpr: npr(creditPrice),
        turnaround: inferTurnaround(name),
        requirements: inferRequirements(category, name),
        tags: inferTags(rawCategory, name),
        riskNote: creditPrice === 0 ? "This is a check, refund, or verification service. Staff will confirm before processing." : undefined,
      };
    });
}

const CSV_UNLOCKING_SERVICE_OFFERS = csvToOffers(servicesCsv);

export const ALL_UNLOCKING_SERVICE_OFFERS: UnlockingServiceOffer[] = [
  ...CSV_UNLOCKING_SERVICE_OFFERS,
  ...UNLOCKING_SERVICE_OFFERS.filter((offer) => !CSV_UNLOCKING_SERVICE_OFFERS.some((csvOffer) => csvOffer.id === offer.id)),
];

export const UNLOCKING_SERVICE_CATEGORIES = Array.from(
  new Set(ALL_UNLOCKING_SERVICE_OFFERS.map((service) => service.category)),
);
