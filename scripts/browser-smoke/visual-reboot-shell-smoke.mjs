#!/usr/bin/env node
/* Real-game five-distro visual acceptance: 5 × Shell/Market/Recon × desktop/phone.
 * All screenshots use the real UI and the real OS installer. Never seed hidden
 * state or substitute screenshot-only markup. Node 24 + playwright-core. */
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const OUT = join(ROOT, "out");
const DEST = join(ROOT, ".smoke", "visual-reboot", "shell-v1");
const PORT = Number(process.env.GHOSTRANK_V1_PORT ?? 3198);
const CHROMIUM = process.env.GHOSTRANK_SMOKE_CHROMIUM
  ?? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
      ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : undefined);
const distros = [
  ["ghost-os", "Ghost", "topbar-dock"],
  ["lattice", "Lattice", "compact-rail"],
  ["velvet", "Velvet", "edge-shelf"],
  ["daybreak", "Daybreak", "bottom-taskbar"],
  ["petal", "Petal", "soft-dock"],
];
const views = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "phone-390", width: 390, height: 844, isMobile: true },
];
const mime = {".html":"text/html",".js":"text/javascript",".css":"text/css",
  ".svg":"image/svg+xml",".png":"image/png",".ico":"image/x-icon",
  ".woff":"font/woff",".woff2":"font/woff2",".webp":"image/webp",".json":"application/json"};
const captured = [], failures = [];

function server() {
  return createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    if (pathname === "/favicon.ico") { response.writeHead(204).end(); return; }
    const path = resolve(OUT, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!path.startsWith(OUT + "/")) { response.writeHead(403).end(); return; }
    if (!existsSync(path) || statSync(path).isDirectory()) { response.writeHead(404).end(); return; }
    response.writeHead(200, { "content-type": mime[extname(path)] ?? "application/octet-stream" });
    response.end(readFileSync(path));
  });
}
async function startGame(page) {
  await page.goto("http://127.0.0.1:" + PORT + "/", { waitUntil: "load" });
  const handle = page.locator('input[name="player-handle"]');
  await handle.waitFor({ timeout: 30000 });
  await handle.fill("V1ShellWren");
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
  await page.locator(".desktop-surface").waitFor({ timeout: 15000 });
  // Do not allow the SSR fallback markup to create false-positive screenshots.
  await page.locator(".docking-workspace .flexlayout__layout").waitFor({ timeout: 15000 });
  const pause = page.locator(".clock-hud button", { hasText: "Pause" }).first();
  if (await pause.count()) await pause.click();
}
async function activateDistro(page, id, label, mode) {
  if (id !== "ghost-os") {
    await page.getByTitle("System & Appearance (Alt+6)").click();
    const card = page.locator(".distro-card").filter({ hasText: label }).first();
    await card.getByRole("button", { name: "INSTALL", exact: true }).click();
    await page.locator(".distro-installer").waitFor({ state: "hidden", timeout: 18000 });
  }
  const surface = page.locator('.desktop-surface[data-distro="' + id + '"][data-shell-mode="' + mode + '"]');
  await surface.waitFor({ timeout: 12000 });
  const launcher = surface.locator('nav[data-distro-launcher="' + id + '"]');
  if (await launcher.locator("[data-window-id]").count() !== 6) throw new Error(id + ": six-app contract broken");
  const goodIcons = await launcher.locator("img.distro-app-icon").evaluateAll(els =>
    els.length === 6 && els.every(el => el.complete && el.naturalWidth > 0));
  if (!goodIcons) throw new Error(id + ": missing original app icon");
}
async function shot(page, id, viewport, app) {
  const path = join(DEST, id + "-" + app + "-" + viewport + ".png");
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewportWidth = await page.evaluate(() => innerWidth);
  if (width > viewportWidth + 1) throw new Error(id + " " + app + ": horizontal overflow " + width + "/" + viewportWidth);
  await page.screenshot({ path, animations: "disabled", timeout: 30000 });
  if (!existsSync(path) || statSync(path).size < 1024) throw new Error("Empty screenshot: " + path);
  captured.push({ id, viewport, app, bytes: statSync(path).size });
  console.log("CAPTURE", id, viewport, app);
}
async function oneView(browser, view) {
  const context = await browser.newContext({ viewport: { width: view.width, height: view.height },
    ...(view.isMobile ? { isMobile: true, hasTouch: true } : {}), reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => {
    if (response.status() >= 400) errors.push("HTTP " + response.status() + " " + response.url());
  });
  try {
    await startGame(page);
    // Real browser evidence that FlexLayout can float panels and reset layout.
    if (!view.isMobile) {
      await page.getByRole("button", { name: "Float focused application" }).click();
      await page.locator(".flexlayout__float_window, .flexlayout__floating_window").first()
        .waitFor({ timeout: 10000 });
      await page.getByRole("button", { name: "Reset workspace layout" }).click();
      await page.locator(".docking-workspace .flexlayout__layout").waitFor();
    }
    const variants = {
      "ghost-os": ["Dawn", "dawn", "light"],
      lattice: ["Paper", "paper", "light"],
      velvet: ["Mist", "mist", "light"],
      daybreak: ["Dusk", "dusk", "dark"],
      petal: ["Night", "night", "dark"],
    };
    for (const [id, label, mode] of distros) {
      await activateDistro(page, id, label, mode);
      await shot(page, id, view.name, "shell");
      await page.getByTitle("Market & Rig (Alt+4)").click();
      const workstation = page.locator('.hardware-product[data-catalog-id="rig-starter"]');
      await workstation.getByText("Secondhand Workstation").waitFor();
      const starterPrice = await workstation.locator(".hardware-product-price").innerText();
      if (starterPrice.trim().toLowerCase() !== "0 cr") {
        throw new Error(id + ": expected actual 0 CR starter, got " + starterPrice);
      }
      const loadedArt = await workstation.locator("img").evaluate(img =>
        img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0);
      if (!loadedArt) throw new Error(id + ": starter workstation illustration did not load");
      const ownedButPurchasable = await workstation.getByRole("button", { name: "Buy Secondhand Workstation" }).isEnabled();
      if (!ownedButPurchasable) throw new Error(id + ": owned free starter unexpectedly blocks BUY");
      await shot(page, id, view.name, "market");
      const software = page.locator('.os-window-market .software-listing[data-software-id="software-net-monitor"]');
      await software.scrollIntoViewIfNeeded();
      await software.getByText("Commercial Monitoring Suite").waitFor();
      if (!(await software.innerText()).includes("40 cr")
        || !(await software.innerText()).includes("/ world day")
        || await software.locator('[data-slot="card"]').count() !== 1) {
        throw new Error(id + ": real licensed software card/price missing");
      }
      await page.waitForFunction(() => {
        const img = document.querySelector('.software-listing[data-software-id="software-net-monitor"] img');
        return img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0;
      });
      const run = software.getByRole("button", { name: "Run Commercial Monitoring Suite" });
      await run.click();
      await software.getByRole("button", { name: "Stop Commercial Monitoring Suite" }).waitFor();
      await software.getByRole("button", { name: "Stop Commercial Monitoring Suite" }).click();
      await run.waitFor();
      await shot(page, id, view.name, "software");
      // Housing is a live lease choice, not a non-interactive catalog mock.
      const housing = page.locator('.os-window-market .housing-listing[data-housing-id="housing-cowork-loft"]');
      await housing.scrollIntoViewIfNeeded();
      await housing.getByText("Co-working Loft").waitFor();
      if (!(await housing.innerText()).includes("30 cr")
        || !(await housing.innerText()).includes("NET")
        || !(await housing.innerText()).includes("Same district")
        || await housing.locator('[data-slot="card"]').count() !== 1) {
        throw new Error(id + ": projected housing facts or shadcn card missing");
      }
      await page.waitForFunction(() => {
        const img = document.querySelector('.housing-listing[data-housing-id="housing-cowork-loft"] img');
        return img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0;
      });
      await housing.getByRole("button", { name: "Move into Co-working Loft" }).click();
      await housing.getByRole("button", { name: "Move out of Co-working Loft" }).waitFor();
      await housing.getByText("CURRENT LEASE").waitFor();
      await housing.getByRole("button", { name: "Move out of Co-working Loft" }).click();
      await housing.getByRole("button", { name: "Move into Co-working Loft" }).waitFor();
      await shot(page, id, view.name, "housing");
      const machine = page.locator('.os-window-market .machine-listing[data-machine-catalog-id="box-burner"]');
      await machine.scrollIntoViewIfNeeded();
      await machine.getByText("Burner Laptop").waitFor();
      if (!(await machine.innerText()).includes("600 cr")
        || !(await machine.innerText()).includes("CPU")
        || !(await machine.innerText()).includes("MEM")
        || await machine.locator('[data-slot="card"]').count() !== 1) {
        throw new Error(id + ": machine catalog projection/shadcn view missing");
      }
      await page.waitForFunction(() => {
        const img = document.querySelector('.machine-listing[data-machine-catalog-id="box-burner"] img');
        return img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0;
      });
      const walletText = await page.locator(".market-wallet strong").first().innerText();
      const walletCredits = Number(walletText.replace(/[^0-9]/g, ""));
      if (await machine.getByRole("button", { name: "Buy Burner Laptop" }).isEnabled() !== (walletCredits >= 600)) {
        throw new Error(id + ": machine BUY enablement not tied to real wallet");
      }
      await shot(page, id, view.name, "machines");
      const compact = page.locator('.os-window-market .model-listing[data-model-id="model-cloud-compact"]');
      await compact.scrollIntoViewIfNeeded();
      await compact.getByText("Compact Class API").waitFor();
      if (!(await compact.innerText()).includes("40 cr")
        || !(await compact.innerText()).includes("/ world day while running")
        || await compact.locator('[data-slot="card"]').count() !== 1) {
        throw new Error(id + ": projected cloud model rent or shadcn controls missing");
      }
      const localModel = page.locator('.os-window-market .model-listing[data-model-id="model-local-workhorse"]');
      await localModel.scrollIntoViewIfNeeded();
      if (!(await localModel.innerText()).includes("900 cr")
        || !(await localModel.innerText()).includes("VRAM load")
        || await localModel.getByRole("button", { name: "Buy Quantized Workhorse 13B" }).count() !== 1) {
        throw new Error(id + ": local model purchase/VRAM requirements missing");
      }
      await compact.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const img=document.querySelector('.model-listing[data-model-id="model-cloud-compact"] img');
        return img instanceof HTMLImageElement && img.complete && img.naturalWidth>0;
      });
      const runCompact = compact.getByRole("button", { name: "Run Compact Class API" });
      await runCompact.click();
      await compact.getByRole("button", { name: "Stop Compact Class API" }).waitFor();
      await compact.getByText("RUNNING", { exact: true }).waitFor();
      await compact.getByRole("button", { name: "Stop Compact Class API" }).click();
      await runCompact.waitFor();
      await shot(page, id, view.name, "models");
      const authored = page.locator('.os-window-market .authored-tool-listing[data-tool-id="tool-paranoid-scraper"]');
      await authored.scrollIntoViewIfNeeded();
      await authored.getByText("Paranoid Scraper").waitFor();
      if (!(await authored.innerText()).includes("500 cr")
        || !(await authored.innerText()).includes("nullbyte")
        || !(await authored.innerText()).includes("NET")
        || await authored.locator('[data-slot="card"]').count() !== 1) {
        throw new Error(id + ": projected peer tool provenance, stats or shadcn missing");
      }
      await page.waitForFunction(() => {
        const img=document.querySelector('.authored-tool-listing[data-tool-id="tool-paranoid-scraper"] img');
        return img instanceof HTMLImageElement && img.complete && img.naturalWidth>0;
      });
      const priceWallet=Number((await page.locator('.market-wallet strong').first().innerText()).replace(/[^0-9]/g,""));
      const authoredBuy=authored.getByRole("button",{name:"Buy Paranoid Scraper"});
      if (await authoredBuy.isEnabled()!==(priceWallet>=500)) {
        throw new Error(id + ": tool BUY affordance mismatches authoritative wallet");
      }
      // Only exercise real purchase/resale when the scenario has earned enough credits.
      if (priceWallet>=500) {
        await authoredBuy.click();
        const ownedTool=page.locator('.os-window-market .authored-tool-listing[data-owned-tool-id]');
        const copy=ownedTool.filter({hasText:"Paranoid Scraper"}).first();
        await copy.getByRole("button",{name:"Sell Paranoid Scraper"}).waitFor();
        await copy.getByRole("button",{name:"Sell Paranoid Scraper"}).click();
        await authored.getByRole("button",{name:"Buy Paranoid Scraper"}).waitFor();
      }
      await shot(page,id,view.name,"tools");
      // Commission and cancel an actual world-time build using a real running assistant.
      const spec=page.locator('.os-window-market .forge-spec-listing[data-forge-id="workflow-net-monitor"]');
      await spec.scrollIntoViewIfNeeded();
      await spec.getByText("Homegrown Monitoring Loop").waitFor();
      if (!(await spec.innerText()).includes("Commercial Monitoring Suite")
        || !(await spec.innerText()).includes("Planned pipeline")
        || !(await spec.innerText()).includes("VRAM")
        || await spec.locator('[data-slot="card"]').count()!==1) {
        throw new Error(id + ": forge projected IR/shadcn missing");
      }
      await page.waitForFunction(()=>{
        const img=document.querySelector('.forge-spec-listing[data-forge-id="workflow-net-monitor"] img');
        return img instanceof HTMLImageElement&&img.complete&&img.naturalWidth>0;
      });
      const disabledBuild=spec.getByRole("button",{name:"Build Homegrown Monitoring Loop"});
      if(await disabledBuild.isEnabled())throw new Error(id + ": forge BUILD enabled without assistant");
      await compact.scrollIntoViewIfNeeded();
      await compact.getByRole("button",{name:"Run Compact Class API"}).click();
      await spec.scrollIntoViewIfNeeded();
      await disabledBuild.waitFor({state:"visible"});
      if(!(await disabledBuild.isEnabled()))throw new Error(id + ": BUILD unavailable after starting assistant");
      await disabledBuild.click();
      const queued=page.locator('.os-window-market .forge-queue-listing').filter({hasText:"Homegrown Monitoring Loop"}).first();
      await queued.getByRole("button",{name:"Abort Homegrown Monitoring Loop"}).waitFor();
      await queued.getByText("Compact Class API").waitFor();
      await queued.getByRole("button",{name:"Abort Homegrown Monitoring Loop"}).click();
      await queued.waitFor({state:"detached"});
      await compact.scrollIntoViewIfNeeded();
      await compact.getByRole("button",{name:"Stop Compact Class API"}).click();
      await compact.getByRole("button",{name:"Run Compact Class API"}).waitFor();
      await spec.scrollIntoViewIfNeeded();
      await shot(page,id,view.name,"forge");

      await page.getByTitle("Recon (Alt+2)").click();
      await page.locator(".os-window-recon").waitFor();
      const reconRoot = page.locator(".os-window-recon .recon-workstation");
      await reconRoot.locator(".recon-station-heading").waitFor();
      if (await reconRoot.locator('.recon-target-card[data-slot="card"]').count() !== 1
        || await reconRoot.locator('.recon-target-card [data-slot="input"]').count() !== 1
        || await reconRoot.locator('.recon-station-readouts [data-slot="badge"]').count() < 2
        || await reconRoot.locator(".recon-topology-stage .recon-topology-container").count() !== 1
        || await reconRoot.locator(".recon-ops-sidebar .operation-desk").count() !== 1) {
        throw new Error(id + ": Recon shadcn controls or map/operation split did not mount");
      }
      const visualOrder = await reconRoot.evaluate(el => {
        const map = el.querySelector(".recon-topology-stage");
        const operations = el.querySelector(".recon-ops-sidebar");
        return Boolean(map && operations && map.compareDocumentPosition(operations) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      if (!visualOrder) throw new Error(id + ": Recon map must precede operation rail in reading order");
      await page.locator(".os-window-recon .recon-station-heading").scrollIntoViewIfNeeded();
      await shot(page, id, view.name, "recon");
      // Navigation makes the real topology reachable in the narrow dock, with keyboard focus.
      const jumpMap=page.getByRole("button", { name: "Jump to infrastructure topology" });
      await jumpMap.click();
      const focusedMap=page.locator('.os-window-recon .recon-topology-stage');
      await focusedMap.locator('.recon-topology-container').waitFor();
      const falseRank = await focusedMap.getByText("RANK #0", { exact: true }).count();
      if (falseRank) throw new Error(id + ": topology fabricated rank zero for an unknown public lead");
      const mapFocus=await focusedMap.evaluate(el=>({
        focused: document.activeElement===el,
        y:el.getBoundingClientRect().top,
        viewport: window.innerHeight,
      }));
      if (!mapFocus.focused || mapFocus.y<0 || mapFocus.y>mapFocus.viewport-120) {
        throw new Error(id + ": MAP jump failed to focus/scroll topology "+JSON.stringify(mapFocus));
      }
      await shot(page, id, view.name, "recon-topology");
      // Explicit in-game Appearance action, not DOM or store injection.
      const oldColors = await page.locator(".desktop-surface").evaluate(el => {
        const style = getComputedStyle(el);
        return [style.getPropertyValue("--background").trim(), style.getPropertyValue("--foreground").trim()];
      });
      const [labelVariant, themeVariant, colorMode] = variants[id];
      await page.getByTitle("System & Appearance (Alt+6)").click();
      const switchMode = page.locator(".theme-picker").getByRole("button", { name: labelVariant, exact: true });
      await switchMode.click();
      const activeMode = page.locator(
        '.desktop-surface[data-distro="' + id + '"][data-theme="' + themeVariant +
        '"][data-color-mode="' + colorMode + '"]',
      );
      await activeMode.waitFor();
      const colors = await activeMode.evaluate(el => {
        const style = getComputedStyle(el);
        return {
          background: style.getPropertyValue("--background").trim(),
          foreground: style.getPropertyValue("--foreground").trim(),
          colorScheme: style.colorScheme,
          wallpaper: style.getPropertyValue("--distro-wallpaper"),
        };
      });
      if (colors.colorScheme !== colorMode
        || colors.background === oldColors[0]
        || colors.foreground === oldColors[1]
        || !colors.wallpaper.includes(id + "-" + themeVariant + ".svg") && id !== "petal") {
        // Petal Night already owns its established wallpaper family.
        throw new Error(id + ": mode CSS not genuinely switched: " + JSON.stringify(colors));
      }
      // Keep the original six app identities, actions and window layout.
      // FlexLayout uses its own tab close control, not legacy WindowFrame close markup.
      // Selecting Market below must activate the real tab and display its live content.
      await shot(page, id, view.name, themeVariant + "-shell");
      await page.getByTitle("Market & Rig (Alt+4)").click();
      await page.locator('.hardware-product[data-catalog-id="rig-starter"]').waitFor();
      await shot(page, id, view.name, themeVariant + "-market");
      const softwareMode = page.locator('.os-window-market .software-listing[data-software-id="software-net-monitor"]');
      await softwareMode.scrollIntoViewIfNeeded();
      await softwareMode.getByRole("button", { name: "Run Commercial Monitoring Suite" }).waitFor();
      await shot(page, id, view.name, themeVariant + "-software");
      const housingMode = page.locator('.os-window-market .housing-listing[data-housing-id="housing-cowork-loft"]');
      await housingMode.scrollIntoViewIfNeeded();
      await housingMode.getByRole("button", { name: "Move into Co-working Loft" }).waitFor();
      await shot(page, id, view.name, themeVariant + "-housing");
      const machineMode = page.locator('.os-window-market .machine-listing[data-machine-catalog-id="box-burner"]');
      await machineMode.scrollIntoViewIfNeeded();
      await machineMode.getByRole("button", { name: "Buy Burner Laptop" }).waitFor();
      await shot(page, id, view.name, themeVariant + "-machines");
      const modelMode=page.locator('.os-window-market .model-listing[data-model-id="model-cloud-compact"]');
      await modelMode.scrollIntoViewIfNeeded();
      await modelMode.getByRole("button", { name: "Run Compact Class API" }).waitFor();
      await shot(page, id, view.name, themeVariant + "-models");
      const toolsMode=page.locator('.os-window-market .authored-tool-listing[data-tool-id="tool-paranoid-scraper"]');
      await toolsMode.scrollIntoViewIfNeeded();
      await toolsMode.getByRole("button",{name:"Buy Paranoid Scraper"}).waitFor();
      await shot(page,id,view.name,themeVariant+"-tools");
      const forgeMode=page.locator('.os-window-market .forge-spec-listing[data-forge-id="workflow-net-monitor"]');
      await forgeMode.scrollIntoViewIfNeeded();
      await forgeMode.getByRole("button",{name:"Build Homegrown Monitoring Loop"}).waitFor();
      await shot(page,id,view.name,themeVariant+"-forge");
      await page.getByTitle("Recon (Alt+2)").click();
      await page.locator(".os-window-recon").waitFor();
      await page.locator(".os-window-recon .recon-station-heading").waitFor();
      await page.locator(".os-window-recon .recon-station-heading").scrollIntoViewIfNeeded();
      await shot(page, id, view.name, themeVariant + "-recon");
      await page.getByRole("button", { name: "Jump to infrastructure topology" }).click();
      await page.locator('.os-window-recon .recon-topology-stage:focus').waitFor();
      await shot(page, id, view.name, themeVariant + "-recon-topology");
    }
    if (errors.length) throw new Error("Browser errors: " + errors.join(" | "));
  } finally { await context.close(); }
}
if (!existsSync(join(OUT, "index.html"))) throw new Error("Missing static build: npm run build");
mkdirSync(DEST, { recursive: true });
const http = server();
let browser;
try {
  await new Promise((resolveReady, reject) => {
    http.once("error", reject); http.listen(PORT, "127.0.0.1", resolveReady);
  });
  browser = await chromium.launch({ ...(CHROMIUM ? { executablePath: CHROMIUM } : {}),
    headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const view of views) {
    try { await oneView(browser, view); }
    catch (error) { failures.push(view.name + ": " + (error instanceof Error ? error.message : String(error))); }
  }
} finally {
  await browser?.close();
  await new Promise(ok => http.close(ok));
  writeFileSync(join(DEST, "report.json"), JSON.stringify({ expected: 200, captured: captured.length, entries: captured, failures }, null, 2) + "\n");
}
if (captured.length !== 200 || failures.length) {
  console.error("SHELL V1 FAIL:", JSON.stringify({ count: captured.length, failures }, null, 2));
  process.exitCode = 1;
} else console.log("DISTRO 10-MODE PASS: 200/200 Chromium screenshots incl. real Forge BUILD/ABORT and projected IR");
