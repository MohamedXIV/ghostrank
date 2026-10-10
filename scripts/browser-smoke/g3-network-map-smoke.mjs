#!/usr/bin/env node
/**
 * Actual Chromium smoke of the reusable G3 Network Mapping UI.
 * Covers two DIFFERENT content providers using the same command and GUI:
 * Nightshade v2 (authored) and seeded G2 Fresh Scene / High Pressure targets (generated).
 * Browser automation is NOT a human playtest.
 *
 * npm run build && npm run smoke:browser:network
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const OUT = join(ROOT, "out");
const PORT = Number(process.env.GHOSTRANK_G3_BROWSER_PORT ?? "3174");
const REPORT = join(ROOT, ".smoke", "g3-network-map.json");
const VIEWS = [
  { name: "nightshade-desktop", width: 1280, height: 800, scenario: "nightshade-slice" },
  { name: "nightshade-phone", width: 390, height: 844, scenario: "nightshade-slice" },
  { name: "fresh-scene-desktop", width: 1280, height: 800, scenario: "fresh-scene" },
  { name: "high-pressure-desktop", width: 1280, height: 800, scenario: "high-pressure" },
  { name: "high-pressure-phone", width: 390, height: 844, scenario: "high-pressure" },
];
const results = [];

function check(scope, label, truth, info = "") {
  const result = { scope, label, pass: Boolean(truth), info };
  results.push(result);
  console.log(`${result.pass ? "PASS" : "FAIL"} [${scope}] ${label}${info ? ": " + info : ""}`);
  if (!result.pass) throw new Error(`${label}: ${info}`);
}

function makeServer() {
  const mime = {
    ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
    ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2",
    ".png": "image/png", ".ico": "image/x-icon", ".webp": "image/webp",
    ".json": "application/json",
  };
  return createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    const file = resolve(OUT, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!file.startsWith(OUT + "/")) { res.writeHead(403).end(); return; }
    if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
}

async function bootstrap(page, scope, scenario) {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load" });
  const handle = page.locator('input[name="player-handle"]');
  await handle.waitFor({ timeout: 30000 });
  await handle.fill("G3TestWren");
  const picker = page.locator(`.run-scenario-option[data-scenario="${scenario}"] input[type=radio]`);
  await picker.check();
  check(scope, "selected scenario", await picker.isChecked());
  await page.getByRole("button", { name: /start new operation/i }).click();
  await handle.waitFor({ state: "detached", timeout: 60000 });

  // The normal web game opens in the room before entering the workstation.
  for (let i = 0; i < 100; i++) {
    const desktop = page.getByTitle("Recon (Alt+2)");
    if (await desktop.count()) break;
    const use = page.getByRole("button", { name: /use workstation/i });
    if (await use.count() && await use.first().isVisible()) await use.first().click();
    const enter = page.getByRole("button", { name: /enter system \/\/ start/i });
    if (await enter.count() && await enter.first().isVisible()) await enter.first().click();
    await page.waitForTimeout(200);
  }
  const recon = page.getByTitle("Recon (Alt+2)").first();
  await recon.waitFor({ timeout: 30000 });
  const pause = page.locator(".clock-hud button", { hasText: "Pause" }).first();
  if (await pause.count()) await pause.click();
  await recon.click();
}

async function terminal(page, command) {
  await page.getByTitle("Terminal (Alt+1)").first().click();
  const input = page.getByLabel("Terminal command");
  await input.fill(command);
  await input.press("Enter");
  const content = await page.locator(".terminal-output").innerText();
  await page.getByTitle("Recon (Alt+2)").first().click();
  return content;
}

async function routeWorkspace(page) {
  const workspace = page.locator(".network-route-workspace");
  await workspace.waitFor({ timeout: 15000 });
  const carrier = await workspace.locator(".network-route-clues").innerText();
  return { workspace, carrier };
}

async function proveRoute(page, scope, target, previousEvidenceForbidden) {
  const { workspace, carrier } = await routeWorkspace(page);
  check(scope, "two current observations shown", /Carrier clue: sealed/i.test(carrier) && /Echo clue: (circle|triangle)/i.test(carrier), carrier);
  const echo = /Echo clue:\s*(circle|triangle)/i.exec(carrier)?.[1]?.toLowerCase();
  const candidate = workspace.locator(".network-route-candidate")
    .filter({ hasText: `Carrier: sealed · Echo: ${echo}` });
  check(scope, "one matching hypothesis", await candidate.count() === 1);
  const ids = (await terminal(page, `path map ${target}`));
  check(scope, "terminal reads same route candidates", ids.includes("NETWORK MAP") && ids.includes("Known carrier: sealed"), ids.slice(-220));
  if (previousEvidenceForbidden) {
    const text = await page.locator(".recon-infrastructure").innerText();
    check(scope, "hidden destination remains unobserved before proof", !text.includes(previousEvidenceForbidden), text.slice(-220));
  }
  // An incorrect but valid hypothesis must leave usable feedback, not a
  // generic success banner. Only exercise this detour in the desktop run.
  if (scope === "nightshade-desktop") {
    const wrong = workspace.locator(".network-route-candidate")
      .filter({ hasText: "Carrier: public" });
    check(scope, "one visibly incompatible candidate", await wrong.count() === 1);
    await wrong.click();
    await workspace.getByRole("button", { name: "TEST SELECTED ROUTE" }).click();
    const wrongConfirm = workspace.getByRole("group", { name: "Confirm route verification" });
    await wrongConfirm.getByRole("button", { name: "CONFIRM ROUTE TEST" }).click();
    const wrongStatus = await workspace.getByRole("status").innerText();
    check(scope, "wrong route explains the refuted hypothesis", /route refuted/i.test(wrongStatus), wrongStatus);
    check(scope, "refuted route visibly persists as partial progress",
      /Status: REFUTED/i.test(await wrong.innerText()));
    if (previousEvidenceForbidden) {
      const evidence = await page.locator(".recon-infrastructure").innerText();
      check(scope, "wrong route cannot reveal the destination",
        !evidence.includes(previousEvidenceForbidden));
    }
  }

  await candidate.click();
  await workspace.getByRole("button", { name: "TEST SELECTED ROUTE" }).click();
  const confirm = workspace.getByRole("group", { name: "Confirm route verification" });
  await confirm.waitFor();
  check(scope, "shows cost before committing", (await confirm.innerText()).includes("clock and trace cost"));
  await confirm.getByRole("button", { name: "CONFIRM ROUTE TEST" }).click();
  const status = workspace.getByRole("status");
  await status.waitFor();
  check(scope, "route outcome communicates confirmation", /route confirmed/i.test(await status.innerText()));
}

async function runNightshade(page, scope) {
  const panel = page.locator(".briefing-panel");
  await panel.waitFor();
  check(scope, "new run opts into v2", (await panel.innerText()).includes("SIGNAL PATH"));
  await page.getByRole("button", { name: "OBSERVE", exact: true }).first().click();
  await panel.getByRole("button", { name: "ACCEPT", exact: true }).click();
  const targets = page.locator(".target-card");
  await targets.getByRole("button", { name: "OPEN OP" }).first().click();
  await targets.getByRole("button", { name: "SURVEY" }).first().click();
  const relay = page.locator(".machine-card").filter({ hasText: "Outer Relay" });
  await relay.getByRole("button", { name: "INSPECT" }).click();
  const pending = await panel.innerText();
  check(scope, "broker hint pending until boundary", pending.includes("Broker answer due"));
  await terminal(page, "wait 360");
  await page.getByText("Signal Broker routing hint").first().waitFor({ timeout: 30000 });
  await proveRoute(page, scope, "nightshade", "Cold Vault");
  await panel.getByRole("button", { name: "DELIVER MAP" }).click();
  check(scope, "briefing delivery", (await panel.innerText()).includes("DELIVERED"));
}

async function runGeneratedScene(page, scope) {
  // No authored names, contract or Nightshade adapters are used by this path.
  for (const command of ["observe gen-1", "op open gen-1", "survey gen-1", "inspect gen-1-m1"]) {
    const out = await terminal(page, command);
    check(scope, `command ${command}`, !out.includes("COMMAND_FAILED"), out.slice(-110));
  }
  await proveRoute(page, scope, "gen-1", "gen-1-m2");
  const map = await terminal(page, "path map gen-1");
  check(scope, "generated route is independent from Nightshade", map.includes("route:gen-1:recon") && !map.includes("nightshade"));
}

async function runView(browser, spec) {
  const scope = spec.name;
  const context = await browser.newContext({
    viewport: { width: spec.width, height: spec.height },
    ...(spec.width <= 390 ? { hasTouch: true, isMobile: true } : {}),
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  try {
    await bootstrap(page, scope, spec.scenario);
    if (spec.scenario === "nightshade-slice") await runNightshade(page, scope);
    else await runGeneratedScene(page, scope);
    check(scope, "no JavaScript page errors", errors.length === 0, errors.join("; ").slice(0, 260));
  } catch (e) {
    const dest = join(ROOT, ".smoke", `g3-${scope}.png`);
    mkdirSync(join(ROOT, ".smoke"), { recursive: true });
    await page.screenshot({ path: dest, fullPage: true }).catch(() => {});
    check(scope, "browser flow finished", false, String(e?.message ?? e));
  } finally {
    await context.close();
  }
}

async function main() {
  if (!existsSync(join(OUT, "index.html"))) throw new Error("Run npm run build first.");
  const server = makeServer();
  await new Promise((yes, no) => {
    server.once("error", no);
    server.listen(PORT, "127.0.0.1", yes);
  });
  const browser = await chromium.launch({ args: ["--no-sandbox", "--use-gl=swiftshader"] });
  try {
    for (const spec of VIEWS) {
      try { await runView(browser, spec); }
      catch (e) { console.error(String(e)); }
    }
  } finally {
    await browser.close();
    server.close();
  }
  mkdirSync(join(ROOT, ".smoke"), { recursive: true });
  writeFileSync(REPORT, JSON.stringify(results, null, 2) + "\n");
  const failed = results.filter(result => !result.pass);
  console.log(`Browser G3: ${results.length - failed.length} passed; ${failed.length} failed`);
  process.exitCode = failed.length ? 1 : 0;
}
main().catch(e => { console.error(e); process.exit(1); });
