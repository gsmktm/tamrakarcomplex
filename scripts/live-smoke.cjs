#!/usr/bin/env node
/*
  Read-only public website browser smoke probe.
  No sign-ins, checkout submits, user mutations, payment calls or DB writes.
  Tests production and the independent PR deployment with public URLs only.
*/
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const TARGETS = [
  { name: "production", base: "https://tamrakarcomplex.com" },
  { name: "pr9-preview", base: "https://deploy-preview-9--tamrakarcomplex.netlify.app" },
];
const ROUTES = [
  "/",
  "/stores",
  "/marketplace",
  "/repair",
  "/sell-your-phone",
  "/stores/apply",
  "/auth",
  "/buy?q=Galaxy&minPrice=20000",
];
const artifacts = path.join(process.cwd(), "artifacts", "live-smoke");
fs.mkdirSync(artifacts, { recursive: true });
const report = {
  generated_at: new Date().toISOString(),
  nature: "public read-only browser + HTTP smoke (not checkout/RLS/payment verification)",
  targets: [],
};

function addCheck(target, check) {
  target.checks.push(check);
  const state = check.pass ? "PASS" : check.warning ? "WARN" : "FAIL";
  console.log(state + " " + target.name + " " + check.label +
    (check.message ? " — " + check.message : ""));
}

async function httpCheck(target, url, label) {
  try {
    const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(18000) });
    const contentType = response.headers.get("content-type") || "";
    const body = await response.text();
    const isHealth = url.endsWith("/health");
    let pass = response.ok && contentType.includes("html") &&
      (body.includes("<html") || body.includes("<!DOCTYPE html"));
    if (isHealth) {
      try { const json = JSON.parse(body); pass = response.ok && json.status === "ok"; } catch { pass = false; }
    }
    addCheck(target, { label, type: "http", status: response.status, url: response.url, pass,
      warning: isHealth && !pass,
      message: "HTTP " + response.status + "; content-type " + contentType +
        "; body " + body.length + " bytes" +
        (isHealth && !pass ? "; no verified JSON health endpoint" : "") });
  } catch (error) {
    addCheck(target, { label, type: "http", pass: false, message: String(error.message || error) });
  }
}

async function navigatePublic(browser, target, route) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 880 }, locale: "en-US" });
  const jsErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => jsErrors.push(error.message.slice(0, 250)));
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 250)); });
  const url = target.base + route;
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    try {
      await page.waitForFunction(
        () => { const root = document.querySelector("#root"); return !!root && root.textContent.trim().length > 60; },
        null, { timeout: 10000 }
      );
    } catch { /* collect actual result below */ }
    await page.waitForTimeout(800);
    const data = await page.evaluate(() => {
      const root = document.querySelector("#root");
      const text = (root?.textContent || "").trim();
      return { root_found: !!root, root_chars: text.length,
        not_found: /page not found|404 - not found|store not found/i.test(text.slice(0, 4000)),
        title: document.title, heading: document.querySelector("h1")?.textContent?.trim().slice(0, 150) || "" };
    });
    const status = response?.status() || 0;
    const pass = status >= 200 && status < 400 && data.root_found &&
      data.root_chars > 60 && !data.not_found;
    addCheck(target, { label: route, type: "browser", pass, status,
      final_url: page.url(), ...data, js_errors: jsErrors.slice(0, 5),
      browser_console_errors: consoleErrors.slice(0, 5),
      message: "HTTP " + status + ", hydrated chars " + data.root_chars +
        (data.not_found ? ", shows not-found UI" : "") +
        (jsErrors.length ? ", JS exceptions " + jsErrors.length : "") });
    if (route === "/" && pass) {
      await page.screenshot({ path: path.join(artifacts, target.name + "-home.png"), fullPage: true,
        timeout: 15000 }).catch(() => {});
    }
    if (route.startsWith("/buy?")) {
      const current = new URL(page.url());
      const preserved = current.searchParams.get("q") === "Galaxy" &&
        current.searchParams.get("minPrice") === "20000" &&
        current.searchParams.get("tab") === "buy";
      addCheck(target, { label: "buy-query-redirect", pass: preserved,
        warning: !preserved && target.name === "production",
        final_url: page.url(), message: "q, minPrice and tab=buy preserved: " + preserved +
          (!preserved && target.name === "production" ? " (known deployed bug, fixed on PR preview)" : "") });
    }
    if (route === "/" && target.name === "pr9-preview") {
      const tabs = page.getByRole("tab");
      const count = await tabs.count();
      const present = (await page.getByRole("heading", { name: /one destination/i }).count()) > 0 && count >= 4;
      addCheck(target, { label: "new-guided-journey", pass: present,
        message: "journey heading and " + count + " tabs rendered" });
      if (present) {
        await page.getByRole("tab", { name: /book a repair/i }).click({ timeout: 5000 });
        const selected = await page.getByRole("tab", { name: /book a repair/i }).getAttribute("aria-selected");
        const link = await page.getByRole("link", { name: /explore repairs/i }).count();
        addCheck(target, { label: "guided-journey-tab-switch", pass: selected === "true" && link > 0,
          message: "repair tab selected=" + selected + ", CTA count=" + link });
      }
    }
  } catch (error) {
    addCheck(target, { label: route, type: "browser", pass: false, url,
      js_errors: jsErrors.slice(0, 5), message: String(error.message || error).slice(0, 350) });
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const t of TARGETS) {
      const target = { name: t.name, base: t.base, checks: [] };
      report.targets.push(target);
      console.log("\nChecking " + t.name + " at " + t.base);
      await httpCheck(target, t.base + "/", "http-home");
      await httpCheck(target, t.base + "/health", "http-health-or-fallback");
      for (const route of ROUTES) await navigatePublic(browser, target, route);
    }
  } catch (error) {
    report.fatal = String(error.stack || error);
    console.error("Fatal browser probe error:", report.fatal);
  } finally {
    if (browser) await browser.close();
    const file = path.join(artifacts, "live-smoke-report.json");
    fs.writeFileSync(file, JSON.stringify(report, null, 2));
    const all = report.targets.flatMap((t) => t.checks);
    const failures = all.filter((c) => !c.pass && !c.warning);
    const warnings = all.filter((c) => !c.pass && c.warning);
    console.log("\nSummary: " + (all.length - failures.length - warnings.length) +
      " passed, " + warnings.length + " warning(s), " + failures.length + " failed.");
    warnings.forEach((c) => console.log("KNOWN " + c.label + ": " + c.message));
    failures.forEach((c) => console.log("ISSUE " + c.label + ": " + c.message));
    if (failures.length || report.fatal) process.exitCode = 1;
  }
}
main();
