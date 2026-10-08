#!/usr/bin/env node
// G1 closeout browser smoke (#77): the production build in real Chromium, at
// desktop and phone widths. Covers the clock's presentation holds (blocking
// windows, a hidden tab), terminal and GUI playback parity, a rest held under
// a window, reload, phone touch targets, keyboard focus and reduced motion.
//
// Run after a production build:
//   npm run build && npm run smoke:browser
//
// Environment (all optional):
//   GHOSTRANK_SMOKE_VIEWS     comma list of desktop, phone-320, phone-360, phone-390
//                             (default: all four)
//   GHOSTRANK_SMOKE_PORT      port for the static server of out/ (default 3123)
//   GHOSTRANK_SMOKE_CHROMIUM  Chromium executable (default: the sandbox browser
//                             when present, else Playwright's own)
//
// Every view starts from a fresh browser profile, so no earlier save leaks in.
// Results go to .smoke/g1-clock-smoke.json (ignored by git). The exit code is 1
// when any check fails. Real-time checks use generous bands, because pacing is
// measured on a live timer.

import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const OUT_DIR = join(ROOT, "out");
const REPORT_DIR = join(ROOT, ".smoke");
const REPORT_FILE = join(REPORT_DIR, "g1-clock-smoke.json");
const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const PORT = Number(process.env.GHOSTRANK_SMOKE_PORT ?? 3123);
const CHROMIUM =
  process.env.GHOSTRANK_SMOKE_CHROMIUM ??
  (existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined);

const VIEWS = {
  desktop: { width: 1280, height: 800, phone: false },
  "phone-320": { width: 320, height: 640, phone: true },
  "phone-360": { width: 360, height: 740, phone: true },
  "phone-390": { width: 390, height: 844, phone: true },
};
const SELECTED_VIEWS = (process.env.GHOSTRANK_SMOKE_VIEWS ?? Object.keys(VIEWS).join(","))
  .split(",")
  .map((view) => view.trim())
  .filter(Boolean);

const ORIENTATION = "[aria-labelledby='orientation-modal-title']";
const LEGEND = "[aria-labelledby='system-legend-title']";
const NOTICE_HALTED = /Clock halted at Day \d+ · \d\d:\d\d\./;

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

async function runView(browser, name) {
  const spec = VIEWS[name];
  const context = await browser.newContext({
    viewport: { width: spec.width, height: spec.height },
    deviceScaleFactor: 1,
    hasTouch: spec.phone,
    isMobile: spec.phone,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !/404/.test(message.text())) {
      errors.push(`console: ${message.text()}`);
    }
  });

  const check = (label, pass, detail) => record(name, label, Boolean(pass), detail);
  const info = (label, detail) => record(name, label, null, detail);

  const hud = page.locator(".clock-hud");
  const press = (locator) => (spec.phone ? locator.tap() : locator.click());
  const hudButton = (label) => hud.getByRole("button", { name: label, exact: true });
  const terminal = page.getByLabel("Terminal command");
  const hudText = async () =>
    (await hud.count()) ? (await hud.innerText()).replace(/\s+/g, " ") : "";
  const minute = async () => {
    const match = /Day (\d+) · (\d\d):(\d\d)/.exec(await hudText());
    return match
      ? (Number(match[1]) - 1) * 1440 + Number(match[2]) * 60 + Number(match[3])
      : Number.NaN;
  };
  /** World minutes the clock moves over `ms` of real time. */
  const advancedOver = async (ms) => {
    const before = await minute();
    await sleep(ms);
    return (await minute()) - before;
  };
  const pressedSpeeds = () =>
    page.evaluate(() =>
      [...document.querySelectorAll(".clock-hud button[aria-pressed=true]")].map((button) =>
        button.textContent.trim(),
      ),
    );
  const runCommand = async (text) => {
    await terminal.fill(text);
    await terminal.press("Enter");
  };
  const briefingOpen = async () => (await page.locator(ORIENTATION).count()) > 0;
  const openBriefing = async () => {
    await press(page.getByRole("button", { name: "Open operational orientation briefing" }));
    await page.locator(ORIENTATION).waitFor({ timeout: 5000 });
  };
  const dismissBriefing = async () => {
    try {
      await press(page.getByRole("button", { name: /enter system \/\/ start/i }));
    } catch (error) {
      // Record where the briefing and its start button really are, then fail the view.
      const geometry = await page.evaluate(() => {
        const rect = (element) => {
          if (!element) return null;
          const box = element.getBoundingClientRect();
          return [Math.round(box.left), Math.round(box.top), Math.round(box.width), Math.round(box.height)];
        };
        const button = document.querySelector(".orientation-start-btn");
        const center = button ? button.getBoundingClientRect() : null;
        const hit = center ? document.elementFromPoint(center.x + center.width / 2, center.y + center.height / 2) : null;
        return {
          viewport: [window.innerWidth, window.innerHeight],
          panel: rect(document.querySelector(".orientation-panel")),
          panelScrollTop: document.querySelector(".orientation-panel")?.scrollTop ?? null,
          content: rect(document.querySelector(".orientation-content")),
          footer: rect(document.querySelector(".orientation-footer")),
          button: rect(button),
          hitIsButton: Boolean(hit) && (hit === button || button.contains(hit)),
          hitClass: hit ? String(hit.className).slice(0, 60) : null,
          workspaceScrollTop: document.querySelector(".desktop-workspace")?.scrollTop ?? null,
        };
      });
      check("the briefing's start button can be pressed", false, JSON.stringify(geometry));
      throw error;
    }
    await page.locator(ORIENTATION).waitFor({ state: "detached", timeout: 5000 });
  };
  const openDesktop = async () => {
    if (!(await page.locator(".desktop-surface").count())) {
      await press(page.getByRole("button", { name: /use workstation/i }));
      await page.locator(".desktop-surface").waitFor({ timeout: 15000 });
    }
  };
  /** A hidden tab is simulated: the page sees `visibilityState` change and the event fires. */
  const setTabVisible = (visible) =>
    page.evaluate((next) => {
      if (next === "hidden") {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          get: () => "hidden",
        });
      } else {
        delete document.visibilityState;
      }
      document.dispatchEvent(new Event("visibilitychange"));
    }, visible ? "visible" : "hidden");

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load" });
  await press(page.getByRole("button", { name: /start new operation/i }));
  await hud.waitFor({ timeout: 20000 });
  await sleep(500);

  // 1. Opening the briefing holds the clock. It is the first blocking window of a fresh profile.
  await openDesktop();
  await page.locator(ORIENTATION).waitFor({ timeout: 5000 });
  const heldOnOpen = /Held while a window is open/.test(await hudText());
  const movedWhileOpen = await advancedOver(3000);
  // Mobile browsers widen the layout viewport for content wider than the device. That zooms
  // the page out, so the layout must keep the device width while the briefing is up.
  const layoutWidth = await page.evaluate(() => window.innerWidth);
  check("the layout keeps the device width while a window is open", layoutWidth === spec.width, `innerWidth=${layoutWidth} device=${spec.width}`);
  check(
    "opening the briefing holds the clock (3 s, no minutes)",
    heldOnOpen && movedWhileOpen === 0,
    `held=${heldOnOpen} moved=${movedWhileOpen}`,
  );

  // 2. A second blocking window cannot open from the keyboard while one is open.
  await page.keyboard.press("F1");
  await sleep(300);
  const legendOpened = (await page.locator(LEGEND).count()) > 0;
  info("F1 while the briefing is open (global shortcuts stay dormant)", `legend opened=${legendOpened}`);
  if (legendOpened) {
    await press(page.getByRole("button", { name: "CLOSE GLOSSARY" }));
    await page.locator(LEGEND).waitFor({ state: "detached", timeout: 5000 });
  }

  // 3. Closing the briefing resumes live time at the speed the player chose.
  await dismissBriefing();
  await sleep(400);
  const resumed = await advancedOver(3000);
  check(
    "closing the briefing resumes live time (3 s -> 1..3 min)",
    resumed >= 1 && resumed <= 3 && !/Held/.test(await hudText()),
    `delta=${resumed}`,
  );

  // 4. A window that closes in a hidden tab does not resume the clock; returning does not catch up.
  await openBriefing();
  await sleep(300);
  await setTabVisible(false);
  await sleep(300);
  await dismissBriefing();
  await sleep(300);
  const heldByTab = /Held while this tab is hidden/.test(await hudText());
  const movedHidden = await advancedOver(3000);
  check(
    "a window closing in a hidden tab keeps the clock held (3 s, no minutes)",
    heldByTab && movedHidden === 0,
    `held=${heldByTab} moved=${movedHidden}`,
  );
  await setTabVisible(true);
  await sleep(100);
  const beforeReturn = await minute();
  await sleep(300);
  const returnBurst = (await minute()) - beforeReturn;
  check("returning to the tab does not catch up (first 0.3 s moves at most 1 min)", returnBurst <= 1, `burst=${returnBurst}`);
  const afterReturn = await advancedOver(3000);
  check("the tab resumes live time (3 s -> 1..3 min)", afterReturn >= 1 && afterReturn <= 3, `delta=${afterReturn}`);

  // 5. Terminal and GUI drive one clock: pause, resume and speed.
  await runCommand("pause");
  await sleep(400);
  const pausedMoved = await advancedOver(3000);
  const pausedPressed = (await pressedSpeeds()).includes("Pause");
  check(
    "terminal pause holds the clock and marks Pause (3 s, no minutes)",
    pausedMoved === 0 && pausedPressed && /Paused/.test(await hudText()),
    `moved=${pausedMoved} pressed=${JSON.stringify(await pressedSpeeds())}`,
  );
  check("terminal pause answers in the playback wording", (await page.getByText("Clock paused at").count()) > 0);

  await runCommand("resume");
  await sleep(400);
  const resumedMoved = await advancedOver(3000);
  check(
    "terminal resume plays at 1x (3 s -> 1..3 min)",
    resumedMoved >= 1 && resumedMoved <= 3 && (await pressedSpeeds()).includes("1×"),
    `delta=${resumedMoved}`,
  );

  await runCommand("speed 16");
  await sleep(400);
  const fastMoved = await advancedOver(3000);
  check(
    "terminal speed 16 plays at 16x (3 s -> 25..40 min)",
    fastMoved >= 25 && fastMoved <= 40 && (await pressedSpeeds()).includes("16×"),
    `delta=${fastMoved}`,
  );

  await runCommand("speed 1");
  await sleep(300);
  await runCommand("speed 2");
  await sleep(300);
  check("speed 2 is refused with the usage line", (await page.getByText("Usage: speed <1|4|16>").count()) > 0);

  await press(hudButton("Pause"));
  await sleep(400);
  const guiPaused = await advancedOver(2000);
  await runCommand("resume");
  await sleep(400);
  check(
    "GUI pause and terminal resume drive the same clock",
    guiPaused === 0 && (await pressedSpeeds()).includes("1×"),
    `guiPausedMoved=${guiPaused}`,
  );

  // 6. A rest keeps its job under a window: held while it is open, resumed after.
  await runCommand("sleep 720");
  await sleep(1200);
  const restingAtStart = /Sleeping/.test(await hudText());
  check("a rest starts on the clock", restingAtStart, (await hudText()).slice(0, 80));
  if (restingAtStart) {
    await openBriefing();
    await sleep(300);
    const restHeld = /Sleeping/.test(await hudText()) && /Held while a window is open/.test(await hudText());
    const restMoved = await advancedOver(3000);
    check(
      "a rest is held under an open window (3 s, no minutes)",
      restHeld && restMoved === 0,
      `held=${restHeld} moved=${restMoved}`,
    );
    await dismissBriefing();
    await sleep(300);
    const restResumed = await advancedOver(3000);
    check("the same rest resumes at 1x when the window closes (3 s > 30 min)", restResumed > 30, `delta=${restResumed}`);
    if (/Sleeping/.test(await hudText())) {
      await press(hudButton("Halt"));
      await sleep(600);
      check("halting the rest shows a clock-halted notice", NOTICE_HALTED.test(await hudText()));
    } else {
      info("the rest ended before Halt", (await hudText()).slice(0, 90));
    }
  }

  // 7. Terminal and GUI halt give the same notice for a rest.
  await runCommand("sleep 1440");
  await sleep(1500);
  await runCommand("halt");
  await sleep(800);
  const terminalHalt = NOTICE_HALTED.test(await hudText());
  await runCommand("sleep 720");
  await sleep(1500);
  if (/Sleeping/.test(await hudText())) {
    await press(hudButton("Halt"));
    await sleep(800);
  }
  const guiHalt = NOTICE_HALTED.test(await hudText());
  check("terminal halt and GUI Halt show the same kind of notice", terminalHalt && guiHalt, `terminal=${terminalHalt} gui=${guiHalt}`);

  // 8. Reload: the world minute persists, playback speed returns to 1x.
  await press(hudButton("16×"));
  await sleep(2000);
  const preReload = await minute();
  await page.reload({ waitUntil: "load" });
  await hud.waitFor({ timeout: 20000 });
  await sleep(2000);
  const postReloadPressed = await pressedSpeeds();
  check(
    "reload returns playback to 1x, never to the 16x it was left on",
    postReloadPressed.includes("1×") && !postReloadPressed.includes("16×"),
    JSON.stringify(postReloadPressed),
  );
  const postReload = await minute();
  check(
    "reload keeps the world minute (within save granularity)",
    postReload >= preReload - 2 && postReload <= preReload + 6,
    `pre=${preReload} post=${postReload}`,
  );
  const afterReloadMoved = await advancedOver(3000);
  check("live time continues after reload (3 s -> 1..3 min)", afterReloadMoved >= 1 && afterReloadMoved <= 3, `delta=${afterReloadMoved}`);

  // 9. Layout: touch targets, no overlap with the play surface, no horizontal scroll, header reachable.
  await openDesktop();
  if (await briefingOpen()) {
    await dismissBriefing();
  }
  const geometry = await page.evaluate((deviceWidth) => {
    const viewportWidth = window.innerWidth;
    const inView = (rect) => rect.left >= -0.5 && rect.right <= viewportWidth + 0.5;
    const hudRect = document.querySelector(".clock-hud")?.getBoundingClientRect();
    const surfaceRect = document.querySelector(".game-shell__surface")?.getBoundingClientRect();
    const clockButtons = [...document.querySelectorAll(".clock-hud button")].map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        label: button.textContent.trim(),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        inView: inView(rect),
      };
    });
    const headerButtons = [...document.querySelectorAll(".os-bar button")].map((button) => {
      const rect = button.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return {
        label: button.textContent.trim(),
        inView: inView(rect),
        hitOk: Boolean(hit) && (hit === button || button.contains(hit)),
      };
    });
    return {
      clockButtons,
      headerButtons,
      hudAboveSurface: Boolean(hudRect && surfaceRect) && hudRect.bottom <= surfaceRect.top + 0.5,
      // Measured against the device width, so a widened layout viewport cannot hide overflow.
      horizontalOverflow: Math.max(document.documentElement.scrollWidth, viewportWidth) - deviceWidth,
      layoutWidth: viewportWidth,
    };
  }, spec.width);

  const undersized = geometry.clockButtons.filter((button) => button.width < 44 || button.height < 44);
  if (spec.phone) {
    check(
      "phone: every clock control is at least 44 css px",
      geometry.clockButtons.length > 0 && undersized.length === 0,
      JSON.stringify(geometry.clockButtons.map((b) => [b.label, b.width, b.height])),
    );
  } else {
    info("desktop clock control sizes (not a phone gate)", JSON.stringify(geometry.clockButtons.map((b) => [b.label, b.width, b.height])));
  }
  check(
    "every clock control is in view",
    geometry.clockButtons.every((button) => button.inView),
    JSON.stringify(geometry.clockButtons.filter((b) => !b.inView)),
  );
  check(
    "header controls are in view and hit-testable",
    geometry.headerButtons.length > 0 && geometry.headerButtons.every((b) => b.inView && b.hitOk),
    JSON.stringify(geometry.headerButtons.filter((b) => !b.inView || !b.hitOk).map((b) => b.label)),
  );
  check("the clock strip sits above the play surface, not over it", geometry.hudAboveSurface, "");
  check("no horizontal page scroll and no sideways zoom", geometry.horizontalOverflow <= 0 && geometry.layoutWidth === spec.width, `overflow=${geometry.horizontalOverflow} layout=${geometry.layoutWidth}`);

  // 10. Keyboard focus: a clock control takes a visible ring when reached by keyboard.
  await hud.getByRole("button").first().focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const focus = await page.evaluate(() => {
    const element = document.activeElement;
    const style = element ? getComputedStyle(element) : null;
    return {
      inClock: Boolean(element?.closest(".clock-hud")),
      label: element?.textContent?.trim() ?? "",
      focusVisible: Boolean(element?.matches(":focus-visible")),
      outline: style ? `${style.outlineStyle} ${style.outlineWidth}` : "",
    };
  });
  check(
    "keyboard focus on a clock control shows a visible ring",
    focus.inClock && focus.focusVisible && focus.outline.startsWith("solid 2px"),
    JSON.stringify(focus),
  );

  // 11. Reduced motion: the clock keeps its pace.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await sleep(300);
  const reduced = await advancedOver(3000);
  check("reduced motion: the clock keeps its pace (3 s -> 1..3 min)", reduced >= 1 && reduced <= 3, `delta=${reduced}`);

  mkdirSync(REPORT_DIR, { recursive: true });
  await page.screenshot({ path: join(REPORT_DIR, `g1-clock-${name}.png`) });

  check("no page or console errors", errors.length === 0, JSON.stringify(errors.slice(0, 4)));
  await context.close();
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
