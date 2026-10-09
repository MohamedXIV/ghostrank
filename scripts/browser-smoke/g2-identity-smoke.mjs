#!/usr/bin/env node
// G2 identity browser smoke (#78, D064): the production build in real Chromium.
// Covers the handle rules on the run-start screen, a new run under the chosen
// handle, reload (save and restore), retiring that run to an ended state, the
// replacement prompt on the ended-run screen, and Run History across the new
// run. A phone-width view checks the entry screen does not scroll sideways.
//
// Run after a production build:
//   npm run build && npm run smoke:browser:identity
//
// Environment (all optional):
//   GHOSTRANK_SMOKE_VIEWS     comma list of desktop, phone-390 (default: both)
//   GHOSTRANK_SMOKE_PORT      port for the static server of out/ (default 3124)
//   GHOSTRANK_SMOKE_CHROMIUM  Chromium executable (default: the sandbox browser
//                             when present, else Playwright's own)
//
// Every view starts from a fresh browser profile. Results go to
// .smoke/g2-identity-smoke.json (ignored by git). The exit code is 1 when any
// check fails.

import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const OUT_DIR = join(ROOT, "out");
const REPORT_DIR = join(ROOT, ".smoke");
const REPORT_FILE = join(REPORT_DIR, "g2-identity-smoke.json");
const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const PORT = Number(process.env.GHOSTRANK_SMOKE_PORT ?? 3124);
const CHROMIUM =
  process.env.GHOSTRANK_SMOKE_CHROMIUM ??
  (existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined);

const VIEWS = {
  desktop: { width: 1280, height: 800, phone: false },
  "phone-390": { width: 390, height: 844, phone: true },
};
const SELECTED_VIEWS = (process.env.GHOSTRANK_SMOKE_VIEWS ?? Object.keys(VIEWS).join(","))
  .split(",")
  .map((view) => view.trim())
  .filter(Boolean);

const FIELD = 'input[name="player-handle"]';
const REFUSAL_TAKEN = "Another handle on this network already uses that name.";
const REFUSAL_CHARACTERS = "Use letters and numbers only.";
const REFUSAL_SHORT = "A handle needs at least 3 characters.";

const results = [];
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function record(view, name, pass, detail = "") {
  results.push({ view, name, pass, detail: String(detail) });
  const tag = pass === null ? "INFO" : pass ? "PASS" : "FAIL";
  console.log(`${tag} [${view}] ${name}${detail ? ` :: ${detail}` : ""}`);
}

function serveBuild() {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".txt": "text/plain; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };

  return createServer((request, response) => {
    const { pathname } = new URL(request.url ?? "/", "http://127.0.0.1");
    const decoded = decodeURIComponent(pathname);
    const requested = join(OUT_DIR, decoded === "/" ? "index.html" : decoded);

    // Refuse anything that resolves outside the build folder.
    if (!requested.startsWith(OUT_DIR)) {
      response.writeHead(403).end();
      return;
    }

    if (!existsSync(requested) || statSync(requested).isDirectory()) {
      const notFound = join(OUT_DIR, "404.html");
      response.writeHead(404, { "content-type": mime[".html"] });
      response.end(existsSync(notFound) ? readFileSync(notFound) : "not found");
      return;
    }

    response.writeHead(200, {
      "content-type": mime[extname(requested)] ?? "application/octet-stream",
    });
    response.end(readFileSync(requested));
  });
}

async function runDesktop(page, errors, check, info, spec) {
  const press = (locator) => (spec.phone ? locator.tap() : locator.click());
  const bodyText = () => page.evaluate(() => document.body.innerText);
  const field = page.locator(FIELD);
  const start = page.getByRole("button", { name: /start new operation/i });
  const terminal = page.getByLabel("Terminal command");
  const runCommand = async (text) => {
    await terminal.fill(text);
    await terminal.press("Enter");
  };

  /** Reaches the workstation from the room, dismissing the first-visit briefing. */
  const openWorkstation = async (handle) => {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      if ((await bodyText()).includes(handle)) {
        return;
      }
      const use = page.getByRole("button", { name: /use workstation/i });
      if ((await use.count()) > 0 && (await use.first().isVisible())) {
        await press(use.first());
        const enter = page.getByRole("button", { name: /enter system \/\/ start/i });
        await enter.waitFor({ timeout: 2_000 }).then(() => press(enter)).catch(() => undefined);
      }
      await sleep(300);
    }
    throw new Error(`handle ${handle} never appeared on the workstation`);
  };

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load" });
  await field.waitFor({ timeout: 30_000 });

  // 1. The entry screen holds the start action back and states the rule.
  check("the entry screen asks for a handle", (await page.locator(FIELD).count()) === 1);
  check("start is held back before a handle is accepted", await start.isDisabled());
  check("the standing rule shows before the player types", (await bodyText()).includes("3–16 letters or numbers"));

  // 2. Refusals name the rule that failed, and keep start held back.
  await field.fill("nightshade");
  check("an authored name is refused, ignoring case", (await bodyText()).includes(REFUSAL_TAKEN));
  check("a refused name keeps start held back", await start.isDisabled());
  check("a refused field is marked invalid", (await field.getAttribute("aria-invalid")) === "true");

  await field.fill("Ghost Runner");
  check("a space is refused with the character rule", (await bodyText()).includes(REFUSAL_CHARACTERS));

  await field.fill("ab");
  check("a short handle names the length rule", (await bodyText()).includes(REFUSAL_SHORT));

  // 3. An accepted handle, padded with space, starts the run.
  await field.fill("  Night_Wren  ");
  check("a padded valid handle is accepted", await start.isEnabled());
  check("an accepted field is not marked invalid", (await field.getAttribute("aria-invalid")) === null);

  // The starting scene is chosen on the same screen (D065). The authored scene
  // is the default; the first run takes the generated Fresh Scene.
  const canonicalScene = page.getByRole("radio", { name: /Canonical Underground/ });
  const freshScene = page.getByRole("radio", { name: /Fresh Scene/ });
  check("the authored canonical scene is the default starting scene", await canonicalScene.isChecked());
  await press(freshScene);
  check("a generated scene can be chosen before the run starts", await freshScene.isChecked());
  check("choosing a scene leaves the handle and start action in place", await start.isEnabled());

  await press(start);
  await field.waitFor({ state: "detached", timeout: 60_000 });
  check("the new run opens in the room, not at the entry screen", true);
  await openWorkstation("Night_Wren");
  check("the chosen handle is shown on the workstation", true);

  // 4. Save and reload: the run comes back under the same handle, with no prompt.
  await page.reload({ waitUntil: "load" });
  await openWorkstation("Night_Wren");
  check("a reload restores the run under the chosen handle", true);
  check("a restored run does not ask for a handle again", (await page.locator(FIELD).count()) === 0);

  // 5. Retire the run to an ended state through the terminal. The steps are the
  // same verbs the player types; the cooling period is skipped with `wait`.
  await runCommand("retire plan");
  await sleep(500);
  await runCommand("retire commit");
  await sleep(500);
  await runCommand("wait 2880");
  await sleep(500);
  await runCommand("retire finish");
  const endStart = page.getByRole("button", { name: /start new operation/i });
  await endStart.waitFor({ state: "visible", timeout: 90_000 }).catch(() => undefined);
  const ended = (await endStart.count()) > 0;
  check("retiring the run ends it and offers a fresh operation", ended, ended ? "" : (await bodyText()).slice(0, 240));

  // 6. The ended-run prompt asks for a handle again, with the same rules.
  if (ended) {
    await press(endStart.first());
    await field.waitFor({ timeout: 15_000 });
    check("the replacement prompt opens with an empty handle", (await field.inputValue()) === "");
    check(
      "the replacement prompt starts on the canonical scene again",
      await page.getByRole("radio", { name: /Canonical Underground/ }).isChecked(),
    );
    const confirm = page.getByRole("button", { name: "CONFIRM START FRESH RUN" });
    check("the replacement is held back until a handle is accepted", await confirm.isDisabled());

    await field.fill("Vesper");
    check("a roster name is refused in the replacement", (await bodyText()).includes(REFUSAL_TAKEN));

    await field.fill("Ember_Two");
    await press(confirm);
    await field.waitFor({ state: "detached", timeout: 60_000 });
    await openWorkstation("Ember_Two");
    check("the replacement run opens under its own handle", true);

    // 7. Run History lists the ended run under its handle, across the new run.
    const history = page.getByTitle("Run History (Alt+5)");
    if ((await history.count()) > 0) {
      await press(history.first());
    } else {
      await page.keyboard.press("Alt+5");
    }
    const completed = page.getByLabel(/Completed run: Night_Wren/);
    await completed.first().waitFor({ timeout: 15_000 }).catch(() => undefined);
    check("Run History lists the ended run under its handle", (await completed.count()) > 0);
    const sceneLabel = await completed.first().innerText().catch(() => "");
    check("Run History labels the ended run with its starting scene", sceneLabel.includes("FRESH SCENE"));

    // 8. Reload: History keeps the ended run, and the new run keeps its handle.
    await page.reload({ waitUntil: "load" });
    await openWorkstation("Ember_Two");
    const historyAfter = page.getByTitle("Run History (Alt+5)");
    if ((await historyAfter.count()) > 0) {
      await press(historyAfter.first());
    } else {
      await page.keyboard.press("Alt+5");
    }
    // The list loads from the saved archive, so wait for it rather than sample it.
    const archived = page.getByLabel(/Completed run: Night_Wren/);
    await archived.first().waitFor({ timeout: 15_000 }).catch(() => undefined);
    const archivedScene = await archived.first().innerText().catch(() => "");
    check(
      "after a reload, History still lists the ended run and the new run keeps its handle",
      (await archived.count()) > 0 && (await bodyText()).includes("Ember_Two"),
    );
    check("after a reload, History still labels the run with its scene", archivedScene.includes("FRESH SCENE"));
  }

  // 9. No page or console errors in the whole flow.
  // The build ships no favicon, so every browser asks for /favicon.ico and gets
  // a 404. That is a cosmetic gap, not an app error: report it, do not hide it.
  const faviconMisses = errors.filter((entry) => entry.includes("/favicon.ico"));
  const realErrors = errors.filter((entry) => !entry.includes("/favicon.ico"));
  if (faviconMisses.length > 0) {
    info("the build ships no favicon.ico (browser request answered 404)", `${faviconMisses.length} request(s)`);
  }
  check("no page or console errors", realErrors.length === 0, JSON.stringify(realErrors.slice(0, 4)));
}

async function runPhoneEntry(page, check) {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load" });
  const field = page.locator(FIELD);
  await field.waitFor({ timeout: 30_000 });
  await field.fill("Night_Wren");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check("the phone entry screen does not scroll sideways", overflow <= 0, `overflow=${overflow}px`);
  const start = page.getByRole("button", { name: /start new operation/i });
  check("the phone start action is reachable once a handle is accepted", await start.isEnabled());
}

async function runView(browser, name) {
  const spec = VIEWS[name];
  const context = await browser.newContext({
    viewport: { width: spec.width, height: spec.height },
    ...(spec.phone ? { isMobile: true, hasTouch: true } : {}),
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()} @ ${message.location().url}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      errors.push(`http ${response.status()}: ${response.url()}`);
    }
  });

  const check = (label, pass, detail) => record(name, label, Boolean(pass), detail);
  const info = (label, detail) => record(name, label, null, detail);

  try {
    if (spec.phone) {
      await runPhoneEntry(page, check);
      check("no page or console errors", errors.length === 0, JSON.stringify(errors.slice(0, 4)));
    } else {
      await runDesktop(page, errors, check, info, spec);
    }
  } catch (error) {
    check("the flow completed without an exception", false, String(error?.message ?? error).split("\n")[0]);
  } finally {
    await context.close();
  }
}

async function main() {
  if (!existsSync(join(OUT_DIR, "index.html"))) {
    console.error("No production build in out/. Run `npm run build` first.");
    process.exit(2);
  }

  const unknown = SELECTED_VIEWS.filter((view) => !(view in VIEWS));
  if (unknown.length > 0) {
    console.error(`Unknown view(s): ${unknown.join(", ")}. Known: ${Object.keys(VIEWS).join(", ")}`);
    process.exit(2);
  }

  const server = serveBuild();
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(PORT, "127.0.0.1", resolveListen);
  });

  const browser = await chromium.launch({
    ...(CHROMIUM ? { executablePath: CHROMIUM } : {}),
    args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });

  try {
    for (const view of SELECTED_VIEWS) {
      console.log(`\n== ${view} ==`);
      await runView(browser, view);
    }
  } finally {
    await browser.close();
    server.close();
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(REPORT_FILE, `${JSON.stringify(results, null, 2)}\n`);

  const passed = results.filter((result) => result.pass === true).length;
  const failed = results.filter((result) => result.pass === false);
  const info = results.filter((result) => result.pass === null).length;
  console.log(`\nSUMMARY: ${passed} pass, ${failed.length} fail, ${info} info -> ${REPORT_FILE}`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
