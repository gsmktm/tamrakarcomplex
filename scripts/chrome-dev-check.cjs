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

async function fetchRoute(url, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return {
        status: response.status,
        body: await response.text(),
        error: "",
      };
    } catch (error) {
      lastError = error;
      await sleep(300);
    }
  }
  return { status: 0, body: "", error: lastError?.message || "fetch failed" };
}

function dumpDom(url) {
  const profileDir = mkdtempSync(join(tmpdir(), "tamrakar-chrome-"));
  try {
    try {
      return {
        dom: execFileSync(
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
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 15000,
          },
        ),
        error: "",
      };
    } catch (error) {
      const capturedDom = typeof error.stdout === "string" ? error.stdout : "";
      const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
      if (capturedDom.includes('id="root"')) {
        return { dom: capturedDom, error: stderr };
      }
      return {
        dom: "",
        error: [error.message, stderr].filter(Boolean).join(" | "),
      };
    }
  } finally {
    // A headless Chrome descendant can still hold or rewrite profile files.
    // Retry transient ENOTEMPTY and EBUSY cleanup races without losing DOM results.
    try {
      rmSync(profileDir, { recursive: true, force: true, maxRetries: 12, retryDelay: 250 });
    } catch (error) {
      console.warn("Chrome profile cleanup warning:", error.message);
    }
  }
}

async function main() {
  // Don't hold unread stdout/stderr pipes open: Vite's child process can
  // inherit them and prevent this smoke-check process from exiting.
  const preview = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", checkPort], {
    cwd: process.cwd(),
    stdio: "ignore",
    detached: process.platform !== "win32",
    env: process.env,
  });
  preview.unref();

  try {
    const ready = await waitForServer(baseUrl);
    if (!ready) throw new Error(`Preview server did not start at ${baseUrl}`);

    const report = [];
    for (const route of routes) {
      const url = `${baseUrl}${route}`;
      const response = await fetchRoute(url);
      const chrome = dumpDom(url);
      const dom = chrome.dom;
      const html = dom;
      const hasRoot = html.includes('id="root"');
      const renderedRoot = /<[^>]+id="root"[^>]*>\s*<[a-z]/i.test(dom);
      const hasNotFound = /Store Not Found|Page Not Found|\b404\b/i.test(html);
      const appShellFallback = /<script[^>]+type=["']module["'][^>]+src=/i.test(response.body);
      const httpOk = response.status >= 200 && response.status < 400;
      const chromeUnavailable = !dom && Boolean(chrome.error);
      const confirmedAppFailure = !httpOk || !hasRoot || !renderedRoot || chromeUnavailable;

      report.push({
        route,
        status: response.status,
        http_ok: httpOk,
        chrome_dom_loaded: hasRoot && renderedRoot,
        app_shell_fallback: appShellFallback,
        app_not_found_text: hasNotFound,
        chrome_error: chrome.error,
        chrome_unavailable: chromeUnavailable,
        confirmed_app_failure: confirmedAppFailure,
        fetch_error: response.error,
      });
    }

    console.log("\nChrome dev route check");
    console.log("----------------------");
    for (const item of report) {
      const diagnostics = [
        `status=${item.status}`,
        `http_ok=${item.http_ok}`,
        `chrome_dom_loaded=${item.chrome_dom_loaded}`,
        `app_shell_fallback=${item.app_shell_fallback}`,
        `not_found_text=${item.app_not_found_text}`,
      ];
      if (item.chrome_unavailable) diagnostics.push(`chrome_unavailable=${item.chrome_error}`);
      if (item.fetch_error) diagnostics.push(`fetch_error=${item.fetch_error}`);
      console.log(`${item.route}: ${diagnostics.join(", ")}`);
    }

    const failed = report.filter((item) => item.confirmed_app_failure || item.app_not_found_text);
    if (failed.length > 0) {
      process.exitCode = 1;
      return;
    }

    if (report.some((item) => item.chrome_unavailable)) {
      console.log("\nChrome DOM capture was unavailable; browser validation did not pass.");
    }
  } finally {
    try {
      // npm can leave a Vite grandchild alive. On POSIX, a detached preview
      // owns a new process group so one signal cleans up the whole group.
      if (process.platform !== "win32" && preview.pid) {
        process.kill(-preview.pid, "SIGTERM");
      } else {
        preview.kill("SIGTERM");
      }
    } catch (error) {
      if (error.code !== "ESRCH") {
        console.warn("Preview cleanup warning:", error.message);
      }
    }
  }
}

main().catch((error) => {
  console.error("Chrome dev check failed:", error.message);
  process.exit(1);
});
