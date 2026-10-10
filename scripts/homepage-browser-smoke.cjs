#!/usr/bin/env node
/**
 * Browser regression smoke for the homepage. Exercises actual rendered DOM,
 * not just the Netlify/Vite HTML shell.
 */
const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const { existsSync, mkdirSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const PORT = "4184";
const BASE = "http://127.0.0.1:" + PORT;

function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const names = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
  for (const command of names) {
    try {
      const location = execFileSync("which", [command], { encoding: "utf8" }).trim();
      if (location && existsSync(location)) return location;
    } catch { /* optional binary */ }
  }
  throw new Error("Chrome is not installed; browser validation cannot be claimed");
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const res = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return;
    } catch { /* preview not ready yet */ }
    await new Promise((resolve) => setTimeout(resolve, 450));
  }
  throw new Error("Vite preview did not start");
}

async function run() {
  const preview = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", PORT, "--strictPort"], {
    stdio: "ignore", env: process.env,
  });
  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch({
      executablePath: findChrome(),
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    mkdirSync(join("artifacts", "homepage"), { recursive: true });
    const failures = [];

    for (const width of [360, 390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      try {
        await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.locator(".tc-command-hero").waitFor({ state: "visible", timeout: 18000 });
        await page.locator("#tc-curated-title").waitFor({ state: "visible", timeout: 18000 });

        const metrics = await page.evaluate(() => {
          const hero = document.querySelector(".tc-command-hero");
          const main = document.getElementById("main-content");
          const tiles = [...document.querySelectorAll(".tc-command-tile")];
          const reveal = [...document.querySelectorAll(".tc-reveal-ready")];
          const invisible = reveal.filter((el) => {
            const s = getComputedStyle(el);
            return s.display === "none" || s.visibility === "hidden" || Number(s.opacity) < .01;
          });
          return {
            heroVisible: !!hero && hero.getBoundingClientRect().height > 100,
            mainVisible: !!main && main.getBoundingClientRect().height > 400,
            tileCount: tiles.length,
            invisibleRevealCount: invisible.length,
            viewport: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
          };
        });

        await page.screenshot({ path: join("artifacts", "homepage", "homepage-" + width + ".png"), fullPage: false });
        console.log("Homepage", width + "px", JSON.stringify(metrics));
        if (!metrics.heroVisible || !metrics.mainVisible || metrics.tileCount !== 4 ||
            metrics.invisibleRevealCount > 0 || metrics.scrollWidth > metrics.viewport + 4) {
          failures.push({ width, metrics });
        }
      } catch (error) {
        failures.push({ width, error: error.message });
      } finally {
        await page.close();
      }
    }

    if (failures.length) {
      console.error("Homepage browser smoke failed:", JSON.stringify(failures, null, 2));
      process.exitCode = 1;
    } else {
      console.log("Homepage renders at all tested widths, with no invisible reveal content or horizontal overflow.");
    }
  } finally {
    if (browser) await browser.close();
    preview.kill("SIGTERM");
  }
}
run().catch((error) => { console.error(error); process.exit(1); });
