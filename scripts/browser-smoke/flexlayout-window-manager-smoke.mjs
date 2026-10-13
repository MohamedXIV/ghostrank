#!/usr/bin/env node
/**
 * Real Chromium acceptance for the actual fictional OS. Acts through rendered
 * controls and pointer/keyboard APIs, never by mutating game state or the model.
 * This is not an unassisted human playtest.
 */
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const OUT = join(ROOT, "out");
const DEST = join(ROOT, ".smoke", "visual-reboot", "flexlayout");
const PORT = Number(process.env.GHOSTRANK_FLEXLAYOUT_PORT ?? 3203);
const BROWSER = process.env.GHOSTRANK_SMOKE_CHROMIUM
  ?? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
    ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : undefined);
const checks = [];
function check(label, value, detail = "") {
  const pass = Boolean(value);
  checks.push({ label, pass, detail: String(detail).slice(0, 350) });
  console.log((pass ? "PASS" : "FAIL") + " [FlexLayout] " + label + (detail ? " // " + detail : ""));
  if (!pass) throw new Error(label + (detail ? ": " + detail : ""));
}
function server() {
  const mime = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css",
    ".svg":"image/svg+xml", ".png":"image/png", ".woff":"font/woff",
    ".woff2":"font/woff2", ".webp":"image/webp", ".json":"application/json" };
  return createServer((req, res) => {
    const uri = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    if (uri === "/favicon.ico") { res.writeHead(204).end(); return; }
    const path = resolve(OUT, "." + (uri === "/" ? "/index.html" : uri));
    if (!path.startsWith(OUT + "/")) { res.writeHead(403).end(); return; }
    if (!existsSync(path) || statSync(path).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": mime[extname(path)] ?? "application/octet-stream" });
    res.end(readFileSync(path));
  });
}
async function startGame(page) {
  await page.goto("http://127.0.0.1:" + PORT + "/", { waitUntil: "load" });
  const handle = page.locator('input[name="player-handle"]');
  await handle.waitFor({ timeout: 30000 });
  await handle.fill("DockCheck");
  await page.locator('.run-scenario-option[data-scenario="fresh-scene"] input[type="radio"]').check();
  await page.getByRole("button", { name: /start new operation/i }).click();
  await handle.waitFor({ state: "detached", timeout: 60000 });
  for (let i = 0; i < 100; i++) {
    if (await page.getByTitle("Recon (Alt+2)").count()) break;
    const workstation = page.getByRole("button", { name: /use workstation/i });
    if (await workstation.count() && await workstation.first().isVisible()) await workstation.first().click();
    const enter = page.getByRole("button", { name: /enter system \/\/ start/i });
    if (await enter.count() && await enter.first().isVisible()) await enter.first().click();
    await page.waitForTimeout(200);
  }
  await page.locator('.docking-workspace .flexlayout__layout').waitFor({ timeout: 20000 });
  const pause = page.locator(".clock-hud button", { hasText: "Pause" }).first();
  if (await pause.count()) await pause.click();
}
async function resumeAfterRefresh(page) {
  // A current run resumes from its existing browser save; do not start a fake
  // new player just to make the layout test pass.
  await page.reload({ waitUntil: "load" });
  for (let i = 0; i < 100; i++) {
    const dock = page.locator(".docking-workspace .flexlayout__layout");
    if (await dock.count() && await dock.first().isVisible()) break;
    const workstation = page.getByRole("button", { name: /use workstation/i });
    if (await workstation.count() && await workstation.first().isVisible()) await workstation.first().click();
    const enter = page.getByRole("button", { name: /enter system \/\/ start/i });
    if (await enter.count() && await enter.first().isVisible()) await enter.first().click();
    await page.waitForTimeout(150);
  }
  await page.locator(".docking-workspace .flexlayout__layout").waitFor({ timeout: 30000 });
}
async function layoutState(page) {
  return page.evaluate(() => {
    const json = localStorage.getItem("ghostrank:docking:v1:ghost-os");
    return json ? JSON.parse(json) : null;
  });
}
function findTabset(json, id) {
  const walk = node => {
    if (!node || typeof node !== "object") return null;
    if (node.type === "tabset" && node.children?.some(tab => tab.id === id)) return node;
    for (const child of node.children ?? []) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  };
  return walk(json?.layout);
}
// Follow upstream caplin/FlexLayout native HTML5 DnD test mechanics: the
// initial ~11px movement and dragover delay are required for a real drop.
async function dragTab(page, source, target) {
  const a = await source.boundingBox();
  const b = await target.boundingBox();
  check("drag source and target have real geometry", Boolean(a && b));
  const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const finish = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.move(start.x + 10, start.y + 10);
  await page.mouse.move(start.x + 11, start.y + 11);
  await page.mouse.move(finish.x, finish.y, { steps: 10 });
  await page.waitForTimeout(50);
  await page.mouse.up();
}
async function screenshot(page, name) {
  const path = join(DEST, name + ".png");
  await page.screenshot({ path, animations: "disabled" });
  check("non-empty " + name + " screenshot", statSync(path).size > 1024);
}
async function desktop(browser) {
  const context = await browser.newContext({ viewport: {width:1280,height:800}, reducedMotion:"reduce" });
  const page = await context.newPage();
  const faults = [];
  page.on("pageerror", e => faults.push(e.message));
  page.on("response", r => { if (r.status() >= 400) faults.push("HTTP " + r.status() + " " + r.url()); });
  try {
    await startGame(page);
    check("real FlexLayout not fallback", await page.locator('.docking-workspace .flexlayout__layout').isVisible());
    check("six original launcher icons remain", (await page.locator('nav[data-distro-launcher="ghost-os"] [data-window-id]').count()) === 6);
    check("two real app tabsets initially", (await page.locator(".docking-layout .flexlayout__tabset").count()) === 2);
    const terminal = page.getByRole("tab", { name: "Terminal" });
    const recon = page.getByRole("tab", { name: "Recon" });
    await terminal.waitFor(); await recon.waitFor();

    const maximize = page.getByRole("button", { name: "Maximize" }).first();
    await maximize.click();
    check("native maximize action", (await page.getByRole("button", { name: "Restore" }).count()) > 0);
    await page.getByRole("button", { name: "Restore" }).first().click();
    check("native restore action", (await page.getByRole("button", { name: "Maximize" }).count()) > 0);

    const splitter = page.locator(".docking-layout .flexlayout__splitter").first();
    const box = await splitter.boundingBox();
    check("genuine splitter is visible", Boolean(box), JSON.stringify(box));
    const before = (await page.locator(".docking-layout .flexlayout__tabset").first().boundingBox());
    check("dock geometry exists", Boolean(before));
    const from = { x: box.x + box.width/2, y: box.y + box.height/2 };
    const vertical = box.height > box.width;
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + (vertical ? 55 : 0), from.y + (vertical ? 0 : 55), { steps: 12 });
    await page.mouse.up();
    const after = await page.locator(".docking-layout .flexlayout__tabset").first().boundingBox();
    const changed = vertical ? Math.abs(after.width-before.width) : Math.abs(after.height-before.height);
    check("pointer resizing alters real dock geometry", changed > 12, "delta=" + changed.toFixed(1));

    // Pointer drag a tab from the right pane to the other tabset to form a tab group.
    const dragSource = page.getByRole("tab", { name: "Recon" });
    const dragTarget = page.getByRole("tab", { name: "Terminal" });
    await dragTab(page, dragSource, dragTarget);
    await page.waitForTimeout(400);
    const moved = await layoutState(page);
    const a = findTabset(moved, "terminal"), b = findTabset(moved, "recon");
    check("native pointer dock moves tab into different group", a && b && a.id === b.id,
      JSON.stringify(moved?.layout?.children?.map(n => n.children?.map(t => t.id))));
    await screenshot(page, "desktop-tab-drag");

    // Native tab close is an upstream pointer-only icon inside the accessible tab.
    await page.getByRole("tab", { name: "Recon" }).hover();
    await page.getByRole("tab", { name: "Recon" })
      .locator('[title="Close"]').click();
    await page.getByRole("tab", { name: "Recon" }).waitFor({state:"detached"});
    check("native close actually removes tab", (await page.getByRole("tab", {name:"Recon"}).count()) === 0);
    await page.getByTitle("Recon (Alt+2)").click();
    await page.getByRole("tab", { name: "Recon" }).waitFor();
    check("original launcher reopens closed app", true);

    // Alt+4 opens a real Market tab (not a second fake window model).
    await page.keyboard.press("Alt+4");
    await page.getByRole("tab", { name: "Market" }).waitFor();
    await page.locator('.hardware-product[data-catalog-id="rig-starter"]').waitFor();
    check("keyboard shortcut maps to existing Market and real catalog", true);
    // Preserve OS keyboard contracts while FlexLayout owns the geometry.
    await page.keyboard.press("Alt+w");
    const focusedApp = await page.locator('nav[data-distro-launcher="ghost-os"] [data-focused="true"]')
      .getAttribute("data-window-id");
    check("Alt+W genuinely cycles focused app", focusedApp !== null && focusedApp !== "market",
      "focused=" + focusedApp);
    await page.keyboard.press("F1");
    const glossary = page.getByRole("dialog", { name: /system glossary|glossary|reference/i });
    await glossary.waitFor();
    check("F1 opens accessible modal above FlexLayout", await glossary.isVisible());
    await page.keyboard.press("Escape");
    await glossary.waitFor({ state: "detached" });
    check("Escape closes modal before closing desktop tabs",
      (await page.getByRole("tab", { name: "Market" }).count()) === 1);
    await page.getByRole("tab", { name: "Market" }).click();
    await page.getByRole("button", { name: "Float focused application" }).click();
    await page.locator(".flexlayout__float_window, .flexlayout__floating_window").first().waitFor();
    check("in-page float renders without browser popout", true);
    await screenshot(page, "desktop-floating-market");
    await page.getByRole("button", { name: "Reset workspace layout" }).click();
    await page.locator(".docking-layout .flexlayout__tabset").first().waitFor();

    // A meaningful change to the layout tree must survive a whole page refresh
    // and a new run, without storing any simulation or world state in FlexLayout.
    const targetTab = page.getByRole("tab", { name: "Recon" });
    const sourceTab = page.getByRole("tab", { name: "Terminal" });
    await dragTab(page, targetTab, sourceTab);
    await page.waitForTimeout(400);
    const saved = await layoutState(page);
    check("dragged tab persisted in browser storage", findTabset(saved,"terminal")?.id === findTabset(saved,"recon")?.id);
    await resumeAfterRefresh(page);
    const restored = await layoutState(page);
    check("layout arrangement survives browser refresh", findTabset(restored,"terminal")?.id === findTabset(restored,"recon")?.id);
    const dims = await page.locator('.docking-workspace').boundingBox();
    check("restored workspace still inside desktop", dims && dims.width > 500);
    await screenshot(page, "desktop-restored-layout");
    check("no page or HTTP errors", faults.length === 0, faults.join(" | "));
  } finally { await context.close(); }
}
async function phone(browser) {
  const context = await browser.newContext({ viewport:{width:390,height:844}, isMobile:true,hasTouch:true,reducedMotion:"reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  try {
    await startGame(page);
    check("390px uses one tabset", (await page.locator(".docking-layout .flexlayout__tabset").count()) === 1);
    await page.getByTitle("Recon (Alt+2)").click();
    await page.locator(".os-window-recon").waitFor();
    check("touch target recon visible", await page.locator(".os-window-recon").isVisible());
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check("no horizontal page overflow at 390px", overflow <= 1, overflow);
    await page.getByRole("button", { name:"Reset workspace layout" }).click();
    check("mobile reset remains one tabset", (await page.locator(".docking-layout .flexlayout__tabset").count()) === 1);
    await screenshot(page,"phone-single-pane");
    check("no mobile page errors", errors.length === 0, errors.join(" | "));
  } finally {await context.close();}
}
if (!existsSync(join(OUT,"index.html"))) throw new Error("Missing static build: npm run build");
mkdirSync(DEST,{recursive:true});
const http=server();
let browser;
try {
  await new Promise((ok,reject)=>{http.once("error",reject);http.listen(PORT,"127.0.0.1",ok);});
  browser=await chromium.launch({...(BROWSER?{executablePath:BROWSER}:{}),
    headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  await desktop(browser);
  await phone(browser);
} catch(e) {
  console.error("FLEXLAYOUT ACCEPTANCE FAIL",e);
  process.exitCode=1;
} finally {
  await browser?.close();
  await new Promise(ok=>http.close(ok));
  writeFileSync(join(DEST,"report.json"), JSON.stringify({checks},null,2)+"\n");
}
if (!process.exitCode) console.log("FLEXLAYOUT ACCEPTANCE PASS",checks.length,"real UI checks");
