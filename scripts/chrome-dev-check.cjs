#!/usr/bin/env node

const { execFileSync, spawn } = require("child_process");
const { mkdtempSync, rmSync } = require("fs");
const { tmpdir } = require("os");
const { join } = require("path");

const chromePath = process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const checkPort = process.env.CHECK_PORT || "4174";
const baseUrl = process.env.CHECK_BASE_URL || `http://127.0.0.1:${checkPort}`;
const routes = [
  "/marketplace",
  "/sell-your-phone",
  "/stores",
  "/stores/abc-mobile-center",
  "/store-admin",
  "/admin/stores",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // preview is still booting
    }
    await sleep(500);
  }
  return false;
}

async function fetchStatus(url, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return { status: response.status, error: "" };
    } catch (error) {
      lastError = error;
      await sleep(300);
    }
  }
  return { status: 0, error: lastError?.message || "fetch failed" };
}

function dumpDom(url) {
  const profileDir = mkdtempSync(join(tmpdir(), "tamrakar-chrome-"));
  try {
    try {
      return execFileSync(
        chromePath,
        [
          "--headless=new",
          "--disable-gpu",
          "--no-first-run",
          "--no-default-browser-check",
          `--user-data-dir=${profileDir}`,
          "--virtual-time-budget=5000",
          "--dump-dom",
          url,
        ],
        {
          encoding: "utf8",
          maxBuffer: 1024 * 1024 * 4,
          stdio: ["ignore", "pipe", "ignore"],
          timeout: 15000,
        },
      );
    } catch (error) {
      // Chrome can keep a background connection open after printing the fully
      // rendered DOM. Treat that captured DOM as the test result.
      if (typeof error.stdout === "string" && error.stdout.includes('id="root"')) {
        return error.stdout;
      }
      throw error;
    }
  } finally {
    rmSync(profileDir, { recursive: true, force: true });
  }
}

async function main() {
  const preview = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", checkPort], {
    cwd: process.cwd(),
    stdio: "pipe",
    env: process.env,
  });

  try {
    const ready = await waitForServer(baseUrl);
    if (!ready) throw new Error(`Preview server did not start at ${baseUrl}`);

    const report = [];
    for (const route of routes) {
      const url = `${baseUrl}${route}`;
      let status = 0;
      let fetchError = "";
      const fetchResult = await fetchStatus(url);
      status = fetchResult.status;
      fetchError = fetchResult.error;

      let dom = "";
      let chromeError = "";
      try {
        dom = dumpDom(url);
      } catch (error) {
        chromeError = error.message;
      }

      const hasRoot = dom.includes('id="root"');
      const hasNotFound = /Store Not Found|Page Not Found|404/i.test(dom);
      report.push({
        route,
        status,
        chrome_dom_loaded: hasRoot,
        app_not_found_text: hasNotFound,
        fetch_error: fetchError,
        chrome_error: chromeError,
      });
    }

    console.log("\nChrome dev route check");
    console.log("----------------------");
    for (const item of report) {
      console.log(
        `${item.route}: status=${item.status}, chrome_dom_loaded=${item.chrome_dom_loaded}, not_found_text=${item.app_not_found_text}${item.fetch_error ? `, fetch_error=${item.fetch_error}` : ""}${item.chrome_error ? ", chrome_error=yes" : ""}`,
      );
    }

    const failed = report.filter((item) => (item.status >= 400 && !item.chrome_dom_loaded) || !item.chrome_dom_loaded);
    if (failed.length > 0) process.exit(1);
  } finally {
    preview.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error("Chrome dev check failed:", error.message);
  process.exit(1);
});
