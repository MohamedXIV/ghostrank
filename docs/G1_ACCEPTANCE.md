# G1 acceptance (#77): engineering evidence and remaining gates

**Status (2026-10-09):** G1 engineering complete via PR #93 (`108c517afd11d0d5e29e6850c74252e0918305bd`): D062/D063 playback holds, terminal controls, safe notices, 44px phone targets and checked-in Chromium smoke harness. Claude's Node 24 run: 112 files / 1019 tests passing, and production Chromium 111 PASS / 0 FAIL across desktop and 320/360/390px phone viewports. **Issue #77 remains OPEN for human acceptance; all subjective playtest gates in section 6 are NOT RUN.**

Merged before this acceptance: PR #89 (D057, system jobs for builds, upkeep and outage releases), PR #90 (D058, proportional save path), PR #91 (D059, clock strip in the page flow). #89 also carries the terminal-snapshot regression: `world-schedule.test.ts` "never rewrites an archived terminal world on restore" (`ab4aafa`) and its guard in `reconcileSchedule` (`936472b`).

## 1. Computer header at narrow widths (D060)

Before: at 390 px, DIRECTIVES (x 402–469) and ROOM (x 477–499) were off the screen, GLOSSARY was cut at x 396, and the stats overflowed the 42 px bar. Nothing scrolled, because the desktop surface clips overflow. At 360 px the same controls were off-screen.

After, measured in the production build (`check-header.mjs`, `check-header-touch.mjs`, scratch scripts outside the repo):

| Viewport | Result |
|---|---|
| 390×844 | One 44 px row: NEW RUN 12–103, GLOSSARY 109–207, DIRECTIVES 213–311, ROOM 317–378. Each in view and hit-testable. No horizontal scroll. |
| 360×740 | One 44 px row; ROOM 287–348. |
| 320×640 | ROOM takes its own right-aligned row (247–308). Nothing clipped. |
| 641×800 | Actions wrap as a unit and stay flush right (ROOM 568–629). |
| 768×1024 | Unchanged from before (NEW RUN 423, ROOM 695–756, 42 px bar). |
| 1280×800 | Unchanged from before (NEW RUN 935, ROOM 1207–1268, 42 px bar). |

- Touch: tap on DIRECTIVES, GLOSSARY and ROOM each performs its action at 390 px.
- Keyboard: Tab visits NEW RUN, GLOSSARY, DIRECTIVES, ROOM in DOM order, with a 2 px focus ring on each.
- Distro heights hold on desktop: lattice 38 px, velvet 44 px, comfortable 48 px.
- Unit: `computer-desktop-a11y.test.ts` asserts the DOM order and that ROOM sits inside the actions group.

## 2. Gates (Node 24.21.0)

| Gate | Result |
|---|---|
| `tsc --noEmit -p .` | exit 0 |
| `eslint .` | 0 errors; 1 existing warning (`postcss.config.mjs`) |
| `vitest run` | 111 files, **987 tests passed** (includes the terminal-snapshot regression and the header-order test) |
| `npm run build` | exit 0; `tsconfig.json` reverted |

## 3. Browser acceptance (production build, Chromium)

`acceptance.mjs` ran against `out/` served on port 3123. Desktop is 1280×800. Phone is 390×844 with touch. Result: **42 PASS, 0 FAIL, 8 INFO**. Measured values are in the brackets.

| Check | Desktop | Phone |
|---|---|---|
| Live pace at 1× (2/3 min/s; 6 s expects 3–5 min) | PASS [4] | PASS [4] |
| Live pace at 4× (8/3 min/s; 6 s expects 14–18 min) | PASS [16] | PASS [16] |
| Pause holds exactly (3 s) | PASS [23→23] | PASS [23→23] |
| Resume at 1× runs live (3 s expects 1–3 min) | PASS [2] | PASS [2] |
| Rest at 1× paced at 30 min/s (5 s expects 110–190) | PASS [150] | PASS [150] |
| Rest at 16× completes at +1440 with no interrupt | PASS [1440] | PASS [1440] |
| Terminal `halt` shows a clock-halted notice and live pace resumes | PASS [2 in 3 s] | PASS [2 in 3 s] |
| GUI Halt shows the same notice kind and live pace resumes | PASS [2 in 3 s] | PASS [2 in 3 s] |
| Reload mid-rest keeps the rest, no rollback | PASS | PASS |
| Reloaded rest completes at +1440 | PASS [1441] | PASS [1440] |
| Reload mid-live keeps the minute; live continues | PASS | PASS |
| Header: four controls in view and hit-testable | PASS | PASS (44 px each) |
| HUD and header do not overlap; no horizontal scroll | PASS | PASS |
| No page or console errors | PASS | PASS |

**Terminal/GUI parity.** Halt is the one control both sides issue as the same domain command (`cancelAdvance`), and both produce the same result. Pause and speed are playback controls under D056 (presentation pacing, not world truth). They are GUI-only and have no terminal verb, so there is no parity to test for them yet. Whether the terminal should gain a pause verb is an open question (section 5).

**Save path.** Simulation probe, outside the browser: a snapshot and restore in the middle of a 1440-minute rest gives an identical event stream to the uninterrupted run, for six seeds, including rests stopped by a contract expiry. Fresh 1440-minute rests complete for ten seeds.

**Probe finding, not a bug.** For several seeds, a rest that crossed minute 2160, 2520 or 2880 was stopped by `ContractExpired`, and the clock then held at that minute. Rests are interruptible by such stops, and contract expiry is a tick action (D054). The reload did not cause the stop, and the restored run matched the uninterrupted one event for event.

**Information recorded by the run (INFO, not PASS):**
- Playback speed returns to 1× after a reload (not persisted; the driver's default).
- The HUD's own buttons are small on both viewports: Pause 56×26, 1× 33×26, 4× 33×26, 16× 41×26 px.

### 3b. Closeout browser smoke (#77 closeout, D062 and D063)

`npm run build && npm run smoke:browser` runs `scripts/browser-smoke/g1-clock-smoke.mjs` against `out/` in Chromium, using the pinned `playwright-core` 1.56.1. It covers desktop 1280×800 and phones 320, 360 and 390 px with touch. Each view starts from a fresh profile. The harness writes `.smoke/g1-clock-smoke.json`, which git ignores, and exits 1 on any FAIL.

**Result on the final bundle:** desktop 27 pass; phone-320 28 pass; phone-360 28 pass; phone-390 28 pass. **111 pass, 0 fail, 5 INFO.**

What it checks:
- Opening the briefing holds the clock (3 s, no minutes). Closing it resumes live time (3 s → 2 min).
- A window that closes in a hidden tab keeps the clock held. Returning to the tab does not catch up (0 min in the first 0.3 s).
- Terminal `pause`, `resume` and `speed` drive the same clock as the HUD (`speed 16` moves 32 min in 3 s). GUI pause and terminal resume share one clock.
- A rest held under a window and resumed at 1× (90 min in 3 s). Terminal and GUI halt give the same notice.
- Reload returns playback to 1× and keeps the world minute. Live time continues after reload.
- Phone clock controls are at least 44 css px (at 320 px: Pause 64×44, 1× 44×44, 4× 44×44, 16× 49×44). Header controls are in view and hit-testable, and there is no horizontal scroll.
- The layout keeps the device width while a window is open. Keyboard focus on a clock control shows a 2 px ring. Reduced motion keeps the pace. No page or console errors.

INFO, not PASS:
- F1 while the briefing is open leaves the glossary closed, because global shortcuts stay dormant while a modal owns focus. Two blocking windows therefore cannot stack from the UI. The stacked hold rule is covered by the unit tests.
- Desktop clock buttons are still 26 px. The 44 px gate applies to phones and coarse pointers.

**Found and fixed by this run.** At 320 px, a `nowrap` mode label with the hold reason, "Held while a window is open", was 445 px wide. Mobile emulation then widened the layout viewport to 457 px and zoomed the whole page out. The first run at 320 px failed on this. The label now wraps, and the check "the layout keeps the device width" guards against a repeat.

**Not exercised in the browser.** A contract expiry needs a seeded contract in the production build. Its naming is covered by `time-driver.test.ts` and `time-notices.test.ts`.

---

## 4. Scheduler dependency evaluation (D061)

No gameplay change. Each candidate was checked against the code.

| Candidate | Today | Verdict |
|---|---|---|
| `dependsOn` in the queue | Implemented and tested in `job-queue.test.ts`. No system job declares a dependency. | Keep the field. Add no dependencies to create queue entries. |
| Compute (delivered shortcut) | Read once at commissioning (`startBuild`); minutes frozen then. | Not a job. |
| Investigations | Advance at each ecosystem tick and at each window end (D032). | Stay derived. |
| Contract expiry | `expireContracts` runs in the tick body (D054). Its stop of a rest is a dispatched interrupt. | Stay a tick action. |
| Retirement cooling | `coolingUntilWorldMinute` stored at start; compared on read (D039). | Stay derived. |
| `rig` resource | Unlimited; contention, not admission (D057). | Admission would need its own decision. |

## 5. Open decisions (answered by the closeout directions below: D062 and D063)

1. **Auto-pause under modal interactions.** Live time keeps running under the DIRECTIVES briefing (measured 2 in 3 s). GAME_FIRST_REBOOT §3 proposes automatic pause for blocking orientation, recovery and modal interactions. Not implemented. Decide: implement (presentation only, resuming the previous speed on close) or drop the proposal.
2. **Notice copy for contract-expiry stops.** A rest stopped by `ContractExpired` shows "Something needs your attention. Time stopped at …", which does not say why. Decide the wording, or whether a stop should name its cause.
3. **Playback speed across reload.** The speed returns to 1× after a reload. Decide whether it should persist.
4. **HUD touch size.** The HUD's own buttons are 26 px tall. The header's controls are 44 px on phones. Decide whether the HUD matches on phones, which would make the strip taller (D059).
5. **Terminal pause.** Pause and speed are GUI-only (D056). Decide whether the terminal should have a pause verb.

### G1 closeout implementation directions (decided after PR #92 merge; IMPLEMENTED on `g1/77-closeout`)

These are default game-first directions, subject to later human playtest feedback. Each is implemented and verified by the tests and the browser smoke named under it. The human feel check is still NOT RUN.

1. **Modal pause:** Opening a blocking DIRECTIVES/orientation, recovery, confirmation, or similarly reading-heavy modal suspends live progression, storing the prior playback mode. Closing the last blocking modal restores the prior mode unless the player explicitly changed it. Nested dialogs and tab visibility must not spuriously resume the clock. Treat this as presentation pacing; do not write a world simulation event.
   - *Shipped (D062):* every `aria-modal` dialog (the orientation briefing, the OS glossary, the distro installer) holds playback under its own id. Closing the last one restores the chosen speed, and a hidden tab holds separately. Nothing writes a world event (`clock-context.tsx`, `time-driver.ts`). Smoke: opening the briefing holds the clock, closing it resumes, and a window closing in a hidden tab stays held.
2. **Expiry notices:** Name `ContractExpired` only if that particular contract/offer was visible to the player. Example: `A known contract deadline passed. Time stopped at Day …`. Otherwise use the existing generic notice. Do not infer hidden actors, targets, or investigation details from the authoritative event alone.
   - *Shipped (D063):* "A known contract deadline passed. Time stopped at Day …" appears only when the expiring contract is on the player's contract list, and otherwise the generic notice. No contract id, issuer or target is shown (`time-notices.ts`). The browser smoke does not reach a contract expiry, so this is covered by the driver and notice unit tests.
3. **Reload speed:** Keep current safe default of **1× on reload**. The durable world minute and running time job persist; last-selected playback acceleration does not. Document the intent so a reload cannot surprise the player with automatic ×16 speed.
   - *Shipped (D062):* a fresh driver starts at 1×. The durable world minute and any running time job persist, and the chosen speed does not. A test restores a rest and checks that it advances at the 1× pace, not the 16× it was left on.
4. **HUD touch targets:** At narrow/touch widths, Pause/1×/4×/16×/Halt must offer an approximately **44×44 CSS-pixel minimum hit target** with focus visibility, wrapping without clipping or covering the play surface. This is a real gameplay control, not a decorative button.
   - *Shipped (D063):* at 640 px and below, and on a coarse pointer, every clock control is at least 44 × 44 css px, with a 2 px focus ring. The strip wraps, and its mode label wraps too, so a hold reason never widens the page. The smoke run measured 44–49 px at 320, 360 and 390 px.
5. **Terminal pause:** Provide terminal `pause` and `resume` (optionally `speed 1|4|16` if consistent with the parser) through the same *presentation clock driver* as the HUD, not through `SimulationCommand` or authoritative world-time events. Keep it keyboard accessible and never double-advance time.
   - *Shipped (D062):* `pause`, `resume` and `speed <1|4|16>` are parsed before the simulation parser and call the same driver as the HUD. They are never `SimulationCommand`s, so they write no event and never advance time themselves. `resume` plays at 1×. The help table, the discovery list and `help pause` all document them.

**Engineering gate (rerun for the closeout, section 3b):** automated tests, typecheck, lint and build on Node 24, then production Chromium desktop + phone 320–390 px smoke including modal open/close, nested modal, hidden tab, concurrent job, reload, terminal/GUI parity and reduced motion. Prefer committing a scrubbed deterministic browser smoke harness for reproducibility. **Human feel/comfort testing remains separate and NOT RUN.**

## 6. Human playtest gates: NOT RUN

No human has played these. Each is recorded as NOT RUN, and none is a PASS.

| Gate | What a human must judge | Current value |
|---|---|---|
| Live pacing feel | Does time feel like it is moving without forcing reflex play? | 1× 2/3 min/s (1 min per 1.5 s); 4× 8/3 min/s |
| Rest pacing feel | Is watching a rest comfortable? | Sleep 30 min/s at 1×; 120 min/s at 4× (sleep and fast-forward base 120) |
| Catch-up fairness | After a hitch or a hidden tab, is the forfeited time fair? | Replays at most 2 s (`CLOCK_CATCHUP_MS`); hidden tab holds the world |
| Notice comprehension | Do players understand "Clock halted", "Time stopped", "Your lease ended" and "Something needs your attention"? | Decision 2 implemented (D063): a visible contract is named, a hidden one stays generic |
| Phone HUD and header | Can a player reach ROOM and DIRECTIVES one-handed? Are the clock's buttons usable? | Header 44 px on phones; HUD 44 px on phones and coarse pointers (D063); desktop HUD 26 px |
| Field Directives dock | Does the dock that opens over the terminal on first entry help or get in the way? | Opens over the top of the phone terminal by default |
| Interrupted rests | Is a stop for a contract expiry a fair, readable interruption? | Stops at 2160, 2520 or 2880 in probes; a visible contract is named (D063) |
| G0 playtest (#76) | Does the vertical-slice brief play as intended? | Pending since PR #85 |

The 3–10 in-game day run length (AGENTS.md) is judged in G4 and G8 by real play, not in G1.

## 7. What is genuinely left for G1

1. **Engineering closeout merged via PR #93.** No further D062/D063 implementation is pending unless human testing finds a defect.
2. **Run the human gates in section 6** and record the evidence. They stay NOT RUN until a human plays the build.
3. **Known residuals.** The terminal help table's `contract accept|decline|deliver` row is one column wider than the other rows. This predates the closeout and is left as it was. The contract-expiry naming is not exercised in the browser (section 3b).
4. The browser acceptance harness is now in the repository (`scripts/browser-smoke`, `npm run smoke:browser`). It is no longer scratch-only.

## 8. Start of G2 (#78)

The dependency-ready start is **player identity**, not procedural worlds.
- Identity needs nothing from G1 beyond the run lifecycle. `createSliceWorldState` already takes a `handle` option (default `CobaltXZ`), and the run schema already stores one (`world-state-schema.ts`).
- The gap is the new-run path: `game-shell.tsx` calls `createNewRunWorldState()` with no options, so every run is `CobaltXZ`. No UI or seed path sets a handle.
- Procedural worlds come after that. They need a named RNG stream per concern (`seeded-rng.ts` and `stateless-hash.ts` exist) and a content seam that accepts a generated roster in place of `instantiateWorldContent()`, plus the id, reachability and solvability checks in GAME_FIRST_REBOOT §4.

Status: **PR #94 (D064) and PR #95 (D065) MERGED.** Players choose a handle and one of three scenarios. Canonical preserves the authored roster. Fresh Scene and High Pressure generate deterministic actors, targets, machines and services, starting ties, and organizations. The simulation now reads them: organizations press an agenda (D066), rivalries and grudges choose intrusions and commissions (D067), hacker archetypes and temperaments change behaviour (D068), and each scene's opportunities and greed shape what is offered, with opening offers from white brokers (D069). A 120-seed sweep checks generation, distinct people, determinism, save round-trip and offer reach (D070). Slices 1–5 are merged as PRs #96–#100 (D066–D070). Alternative PRs #101/#102 were closed unmerged as superseded; `g2/78-temperaments` remains available for reference. G2 #78 stays OPEN. Human G0/G1 playtest gates remain NOT RUN. See `docs/ROADMAP.md`.
