#!/usr/bin/env node
/**
 * Visual Reboot V0 — captures the actual, unchanged player UI BEFORE migration.
 * Node 24 + Playwright Core. Run after npm run build.
 * Images and reports are generated under .smoke/visual-reboot/before.
 */
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const OUT = join(ROOT, "out");
const REPORT_DIR = join(ROOT, ".smoke", "visual-reboot", "before");
const PORT = Number(process.env.GHOSTRANK_V0_PORT ?? "3197");
const CHROMIUM = process.env.GHOSTRANK_SMOKE_CHROMIUM ??
  (existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
    ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : undefined);
const views = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "phone-390", width: 390, height: 844, isMobile: true },
];
const recorded = [];
const failures = [];
const mime = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2",
  ".png": "image/png", ".ico": "image/x-icon", ".webp": "image/webp",
  ".json": "application/json",
};

function staticServer() {
  return createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    if (pathname === "/favicon.ico") { res.writeHead(204).end(); return; }
    const requested = resolve(OUT, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!requested.startsWith(OUT + "/")) { res.writeHead(403).end(); return; }
    if (!existsSync(requested) || statSync(requested).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": mime[extname(requested)] ?? "application/octet-stream" });
    res.end(readFileSync(requested));
  });
}

async function bootstrap(page) {
  await page.goto("http://127.0.0.1:" + PORT + "/", { waitUntil: "load" });
  const handle = page.locator('input[name="player-handle"]');
  await handle.waitFor({ timeout: 30000 });
  await handle.fill("V0VisualWren");
  await page.locator('.run-scenario-option[data-scenario="fresh-scene"] input[type="radio"]').check();
  await page.getByRole("button", { name: /start new operation/i }).click();
  await handle.waitFor({ state: "detached", timeout: 60000 });
  for (let i = 0; i < 100; i++) {
    const open = page.getByTitle("Recon (Alt+2)");
    if (await open.count()) return;
    for (const pattern of [/use workstation/i, /enter system \/\/ start/i]) {
      const btn = page.getByRole("button", { name: pattern });
      if (await btn.count() && await btn.first().isVisible()) await btn.first().click();
    }
    await page.waitForTimeout(200);
  }
  throw new Error("Computer desktop was not reachable after starting Fresh Scene");
}

async function capture(page, view, name) {
  const location = join(REPORT_DIR, name + "-" + view.name + ".png");
  await page.screenshot({ path: location, animations: "disabled", timeout: 30000 });
  if (!existsSync(location) || statSync(location).size < 1000) {
    throw new Error("Screenshot missing/empty: " + location);
  }
  recorded.push({ name, viewport: view.name, path: location.slice(ROOT.length + 1), bytes: statSync(location).size });
  console.log("CAPTURE " + name + " " + view.name + " (" + statSync(location).size + " bytes)");
}

async function inspectView(browser, view) {
  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    ...(view.isMobile ? { hasTouch: true, isMobile: true } : {}),
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const issues = [];
  page.on("pageerror", error => issues.push(error.message));
  try {
    await bootstrap(page);
    await page.locator(".desktop-surface").waitFor();
    await capture(page, view, "shell");
    await page.getByTitle("Market & Rig (Alt+4)").click();
    const market = page.locator(".os-window-market");
    await market.waitFor();
    const item = market.getByText("Secondhand Workstation");
    await item.waitFor();
    const buy = market.getByRole("button", { name: "BUY", exact: true });
    if ((await buy.count()) < 1) throw new Error("Real Market BUY control missing");
    await item.scrollIntoViewIfNeeded();
    await capture(page, view, "market");
    await page.getByTitle("Recon (Alt+2)").click();
    const recon = page.locator(".os-window-recon");
    await recon.waitFor();
    await capture(page, view, "recon");
    if (issues.length) throw new Error("Browser JS error: " + issues.join(" | "));
  } finally {
    await context.close();
  }
}

if (!existsSync(join(OUT, "index.html"))) {
  throw new Error("Static build missing: run npm run build first");
}
mkdirSync(REPORT_DIR, { recursive: true });
const server = staticServer();
let browser;
try {
  await new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(PORT, "127.0.0.1", ok);
  });
  browser = await chromium.launch({
    ...(CHROMIUM ? { executablePath: CHROMIUM } : {}),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  for (const view of views) {
    try { await inspectView(browser, view); }
    catch (error) { failures.push(view.name + ": " + (error instanceof Error ? error.message : String(error))); }
  }
} finally {
  await browser?.close();
  await new Promise(ok => server.close(ok));
  writeFileSync(join(REPORT_DIR, "baseline-report.json"),
    JSON.stringify({ kind: "actual-main-ui", scenario: "fresh-scene", screenshots: recorded, failures }, null, 2) + "\n");
}
if (recorded.length !== 6 || failures.length) {
  console.error("V0 baseline FAIL", { screenshots: recorded.length, failures });
  process.exitCode = 1;
} else {
  console.log("V0 baseline PASS 6/6 real game captures");
}