#!/usr/bin/env node
// G3 Nightshade briefing browser smoke (#79, D071): the production build in real
// Chromium. It plays the briefing's routes through the UI on desktop and at
// phone width: the quiet route, the intrusive route (trace preview, cancel,
// confirmation, and the same act through the terminal), the burn, the owner's
// review with the re-read response, and declining. Every route starts a fresh
// run in a fresh browser profile, so the routes never share state.
//
// Run after a production build:
//   npm run build && npm run smoke:browser:slice
//
// Environment (all optional):
//   GHOSTRANK_SMOKE_VIEWS     comma list of desktop, phone-390 (default: both)
//   GHOSTRANK_SMOKE_ROUTES    comma list of quiet, intrusive, burn, respond, decline
//   GHOSTRANK_SMOKE_PORT      port for the static server of out/ (default 3125)
//   GHOSTRANK_SMOKE_CHROMIUM  Chromium executable (default: the sandbox browser
//                             when present, else Playwright's own)
//
// Results go to .smoke/g3-slice-smoke.json (ignored by git). The exit code is 1
// when any check fails.

import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const OUT_DIR = join(ROOT, "out");
const REPORT_DIR = join(ROOT, ".smoke");
const REPORT_FILE = join(REPORT_DIR, "g3-slice-smoke.json");
const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const PORT = Number(process.env.GHOSTRANK_SMOKE_PORT ?? 3125);
const CHROMIUM =
  process.env.GHOSTRANK_SMOKE_CHROMIUM ??
  (existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined);

const VIEWS = {
  desktop: { width: 1280, height: 800, phone: false },
  "phone-390": { width: 390, height: 844, phone: true },
};
const ROUTES = ["quiet", "intrusive", "burn", "respond", "decline"];

function pick(env, known) {
  const selected = (env ?? known.join(","))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const unknown = selected.filter((item) => !known.includes(item));
  if (unknown.length > 0) {
    console.error(`Unknown: ${unknown.join(", ")}. Known: ${known.join(", ")}`);
    process.exit(2);
  }
  return selected;
}
const SELECTED_VIEWS = pick(process.env.GHOSTRANK_SMOKE_VIEWS, Object.keys(VIEWS));
const SELECTED_ROUTES = pick(process.env.GHOSTRANK_SMOKE_ROUTES, ROUTES);

const FIELD = 'input[name="player-handle"]';
const HANDLE = "Slice_Wren";

const results = [];
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function record(scope, name, pass, detail = "") {
  results.push({ scope, name, pass, detail: String(detail) });
  const tag = pass === null ? "INFO" : pass ? "PASS" : "FAIL";
  console.log(`${tag} [${scope}] ${name}${detail ? ` :: ${detail}` : ""}`);
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

/** Plays one route on one page. `check` records a named result under the route. */
async function playRoute(page, spec, route, check, errors) {
  const press = (locator) => (spec.phone ? locator.tap() : locator.click());
  const bodyText = () => page.evaluate(() => document.body.innerText);
  const field = page.locator(FIELD);
  const start = page.getByRole("button", { name: /start new operation/i });
  const panel = page.locator(".briefing-panel");
  const panelText = async () => ((await panel.count()) > 0 ? panel.first().innerText() : "");
  const briefingButton = (name) => panel.getByRole("button", { name, exact: true });
  const operationText = async () =>
    (await page.locator(".operation-panel").count()) > 0
      ? page.locator(".operation-panel").first().innerText()
      : "";
  const machineCard = (label) => page.locator(".machine-card").filter({ hasText: label });
  const targetButton = (name) =>
    page.locator(".target-card").getByRole("button", { name, exact: true });
  const confirm = page.getByRole("alertdialog", { name: "Confirm trace cost" });
  const openApp = (title) => press(page.getByTitle(title).first());

  /**
   * Runs a terminal command and returns the terminal's text while it is still
   * on screen, then brings the recon app back to the front for the GUI steps.
   */
  const runCommand = async (text) => {
    await openApp("Terminal (Alt+1)");
    const terminal = page.getByLabel("Terminal command");
    await terminal.fill(text);
    await terminal.press("Enter");
    await sleep(300);
    const output = await bodyText();
    await openApp("Recon (Alt+2)");
    return output;
  };

  const until = async (test, timeout = 10_000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await test()) return true;
      await sleep(200);
    }
    return false;
  };

  /** Reaches the workstation from the room, dismissing the first-visit briefing. */
  const openWorkstation = async () => {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      if ((await bodyText()).includes(HANDLE)) return;
      const use = page.getByRole("button", { name: /use workstation/i });
      if ((await use.count()) > 0 && (await use.first().isVisible())) {
        await press(use.first());
        const enter = page.getByRole("button", { name: /enter system \/\/ start/i });
        await enter.waitFor({ timeout: 2_000 }).then(() => press(enter)).catch(() => undefined);
      }
      await sleep(300);
    }
    throw new Error(`handle ${HANDLE} never appeared on the workstation`);
  };

  // Every route starts the same way: a fresh Nightshade run, a held clock, recon open.
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load" });
  await field.waitFor({ timeout: 30_000 });
  await field.fill(HANDLE);
  const nightshade = page.getByRole("radio", { name: /Nightshade Briefing/ });
  await press(nightshade);
  check("the Nightshade briefing can be chosen as the starting scene", await nightshade.isChecked());
  await press(start);
  await field.waitFor({ state: "detached", timeout: 60_000 });
  await openWorkstation();

  // Hold the clock so only the player's acts move the world. Time the route
  // needs is taken with the terminal's `wait`, which is the same clock.
  const pause = page.locator(".clock-hud button", { hasText: "Pause" }).first();
  if ((await pause.count()) > 0) {
    await press(pause);
  }

  await openApp("Recon (Alt+2)");
  await panel.first().waitFor({ state: "visible", timeout: 15_000 });
  check(`[${route}] the briefing opens in the recon app with its offer`, (await panelText()).includes("OFFERED"));
  check(
    `[${route}] the briefing does not name the vault before the broker routes it`,
    !(await panelText()).includes("Cold Vault"),
  );

  if (route === "decline") {
    await press(briefingButton("DECLINE"));
    check(`[${route}] declining closes the briefing as declined`, (await panelText()).includes("DECLINED"));
    check(`[${route}] a declined briefing offers no further act`, (await briefingButton("ACCEPT").count()) === 0);
    check(
      `[${route}] the declined briefing states that nothing was touched`,
      (await panelText()).includes("Nothing was touched"),
    );
    check(`[${route}] no operation opens after a decline`, (await operationText()).includes("No active operation"));
    finish(route);
    return;
  }

  await press(page.getByRole("button", { name: "OBSERVE", exact: true }).first());
  await press(briefingButton("ACCEPT"));
  check(`[${route}] accepting the offer makes it a delivery`, (await panelText()).includes("ACCEPTED"));

  // The terminal reads the same briefing the desktop shows (D071).
  const briefOutput = await runCommand("brief");
  check(`[${route}] the terminal's brief shows the same briefing`, briefOutput.includes("NIGHTSHADE BRIEFING //"));

  await press(targetButton("OPEN OP"));
  await press(targetButton("SURVEY"));
  check(
    `[${route}] a survey maps the relay and not the vault`,
    (await machineCard("Outer Relay").count()) === 1 && (await machineCard("Cold Vault").count()) === 0,
  );

  // Before the broker is read the vault stays off the map, and a second survey says why.
  await press(targetButton("SURVEY"));
  check(
    `[${route}] a second survey names the broker as the way forward`,
    (await panelText()).includes("Read the broker first"),
  );

  await press(machineCard("Outer Relay").getByRole("button", { name: "INSPECT" }));
  check(
    `[${route}] reading the relay's broker promises routing at the next boundary`,
    (await panelText()).includes("Broker answer due"),
  );

  if (route === "quiet") {
    await runCommand("wait 360");
    await until(async () => (await panelText()).includes("Routing from the broker"));
    check(`[${route}] the broker's routing arrives at the boundary`, (await panelText()).includes("Routing from the broker"));
    await press(targetButton("SURVEY"));
    check(`[${route}] the vault joins the map once the routing is known`, (await machineCard("Cold Vault").count()) === 1);
    check(`[${route}] the map is complete`, (await panelText()).includes("2 / 2"));
    await press(briefingButton("DELIVER MAP"));
    check(`[${route}] the quiet route delivers the map`, (await panelText()).includes("DELIVERED"));
    check(`[${route}] the quiet route ends at footprint 3`, (await panelText()).includes("3 / 8"));
    check(`[${route}] no owner watch on the quiet route`, (await panelText()).includes("NOT YET"));
    finish(route);
    return;
  }

  // Every route past this point escalates, so the preview comes first.
  const escalate = page.getByRole("button", { name: "ESCALATE", exact: true });
  check(`[${route}] escalation is available once the broker is read`, await escalate.isEnabled());
  await press(escalate);
  await confirm.waitFor({ state: "visible", timeout: 10_000 });
  check(
    `[${route}] the confirmation names the trace cost before anything is paid`,
    (await confirm.innerText()).includes("+3 high trace"),
  );
  check(`[${route}] the confirmation has not yet escalated`, (await operationText()).includes("RECON"));
  await press(confirm.getByRole("button", { name: "CANCEL", exact: true }));
  await confirm.waitFor({ state: "detached", timeout: 10_000 }).catch(() => undefined);
  check(`[${route}] cancelling the confirmation keeps the recon stage`, (await operationText()).includes("RECON"));

  if (route === "intrusive") {
    const refused = await runCommand("op escalate");
    check(`[${route}] the terminal refuses an unconfirmed escalation with its reason`, refused.includes("escalation_unconfirmed"));
    const preview = await runCommand("op preview");
    check(`[${route}] the terminal previews the trace cost`, preview.includes("Escalate: +3 high trace"));
    await runCommand("op escalate confirm");
    check(
      `[${route}] the confirmed escalation from the terminal reaches the desktop`,
      await until(async () => (await operationText()).includes("INTRUSIVE")),
    );
  } else {
    await press(escalate);
    await confirm.waitFor({ state: "visible", timeout: 10_000 });
    await press(confirm.getByRole("button", { name: "CONFIRM ESCALATION", exact: true }));
    check(`[${route}] the confirmed escalation moves the operation to intrusive`, (await operationText()).includes("INTRUSIVE"));
  }

  check(`[${route}] the vault is on the map at once after escalation`, (await machineCard("Cold Vault").count()) === 1);
  check(`[${route}] the owner starts watching at footprint 5`, (await panelText()).includes("ACTIVE"));
  check(`[${route}] the owner's review is reported as due`, (await panelText()).includes("Owner review due"));

  if (route === "intrusive") {
    await press(briefingButton("DELIVER MAP"));
    check(`[${route}] delivering under watch still delivers the map`, (await panelText()).includes("DELIVERED"));
    check(`[${route}] the intrusive route ends at footprint 5`, (await panelText()).includes("5 / 8"));
    finish(route);
    return;
  }

  if (route === "burn") {
    await press(machineCard("Cold Vault").getByRole("button", { name: "INSPECT" }));
    check(`[${route}] reading the vault's archive is one more probe`, (await panelText()).includes("6 / 8"));
    await press(page.getByRole("button", { name: "DISENGAGE", exact: true }));
    await confirm.waitFor({ state: "visible", timeout: 10_000 });
    check(
      `[${route}] leaving names the burn before it happens`,
      (await confirm.innerText()).includes("ends the briefing as Burned"),
    );
    await press(confirm.getByRole("button", { name: "CONFIRM LEAVE", exact: true }));
    check(`[${route}] leaving at the line burns the briefing`, (await panelText()).includes("BURNED"));
    check(`[${route}] a burned briefing offers no further act`, (await briefingButton("DELIVER MAP").count()) === 0);
    finish(route);
    return;
  }

  // respond: the owner's review rotates the vault off the map, and the player re-reads the broker.
  await runCommand("wait 360");
  await until(async () => (await panelText()).includes("Owner review ran"));
  check(`[${route}] the owner's review runs at the boundary and rotates the vault`, (await panelText()).includes("Owner review ran"));
  check(`[${route}] the map drops to one machine after the review`, (await panelText()).includes("1 / 2"));

  await press(targetButton("SURVEY"));
  check(`[${route}] a survey after the review says the vault is locked`, (await panelText()).includes("rotated key"));

  await press(machineCard("Outer Relay").getByRole("button", { name: "INSPECT" }));
  check(
    `[${route}] re-reading the broker promises the rotated routing`,
    (await panelText()).includes("Routing after the review"),
  );
  await runCommand("wait 360");
  await until(async () => (await panelText()).includes("The broker's routing changed"));
  check(`[${route}] the rotated routing arrives at the next boundary`, (await panelText()).includes("The broker's routing changed"));
  await press(targetButton("SURVEY"));
  check(`[${route}] the vault is recovered with the rotated key`, (await machineCard("Cold Vault").count()) === 1);
  await press(briefingButton("DELIVER MAP"));
  check(`[${route}] the response path delivers the map`, (await panelText()).includes("DELIVERED"));
  check(`[${route}] the response path ends at footprint 7`, (await panelText()).includes("7 / 8"));
  finish(route);

  // No page or console errors in the whole route. Favicon misses are cosmetic.
  function finish(name) {
    const realErrors = errors.filter((entry) => !entry.includes("/favicon.ico"));
    check(`[${name}] no page or console errors`, realErrors.length === 0, JSON.stringify(realErrors.slice(0, 4)));
  }
}

async function runView(browser, name, route) {
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

  const scope = `${name} / ${route}`;
  const check = (label, pass, detail) => record(scope, label, Boolean(pass), detail);

  try {
    await playRoute(page, spec, route, check, errors);
  } catch (error) {
    check("the route completed without an exception", false, String(error?.message ?? error).split("\n")[0]);
  } finally {
    await context.close();
  }
}

async function main() {
  if (!existsSync(join(OUT_DIR, "index.html"))) {
    console.error("No production build in out/. Run `npm run build` first.");
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
      for (const route of SELECTED_ROUTES) {
        console.log(`\n== ${view} / ${route} ==`);
        await runView(browser, view, route);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(REPORT_FILE, `${JSON.stringify(results, null, 2)}\n`);

  const passed = results.filter((result) => result.pass === true).length;
  const failed = results.filter((result) => result.pass === false);
  console.log(`\nSUMMARY: ${passed} pass, ${failed.length} fail -> ${REPORT_FILE}`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
