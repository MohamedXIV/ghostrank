# G1 acceptance (#77): engineering evidence and remaining gates

**Status (2026-10-08):** engineering acceptance is clean on `main` at `637175a` plus this change. **G1 is not complete.** Three design decisions are open (section 5), and the human playtest gates have **not been run** (section 6). No playtest PASS is claimed anywhere in this document.

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

## 5. Open decisions (G1 is not complete until these are answered)

1. **Auto-pause under modal interactions.** Live time keeps running under the DIRECTIVES briefing (measured 2 in 3 s). GAME_FIRST_REBOOT §3 proposes automatic pause for blocking orientation, recovery and modal interactions. Not implemented. Decide: implement (presentation only, resuming the previous speed on close) or drop the proposal.
2. **Notice copy for contract-expiry stops.** A rest stopped by `ContractExpired` shows "Something needs your attention. Time stopped at …", which does not say why. Decide the wording, or whether a stop should name its cause.
3. **Playback speed across reload.** The speed returns to 1× after a reload. Decide whether it should persist.
4. **HUD touch size.** The HUD's own buttons are 26 px tall. The header's controls are 44 px on phones. Decide whether the HUD matches on phones, which would make the strip taller (D059).
5. **Terminal pause.** Pause and speed are GUI-only (D056). Decide whether the terminal should have a pause verb.

## 6. Human playtest gates: NOT RUN

No human has played these. Each is recorded as NOT RUN, and none is a PASS.

| Gate | What a human must judge | Current value |
|---|---|---|
| Live pacing feel | Does time feel like it is moving without forcing reflex play? | 1× 2/3 min/s (1 min per 1.5 s); 4× 8/3 min/s |
| Rest pacing feel | Is watching a rest comfortable? | Sleep 30 min/s at 1×; 120 min/s at 4× (sleep and fast-forward base 120) |
| Catch-up fairness | After a hitch or a hidden tab, is the forfeited time fair? | Replays at most 2 s (`CLOCK_CATCHUP_MS`); hidden tab holds the world |
| Notice comprehension | Do players understand "Clock halted", "Time stopped", "Your lease ended" and "Something needs your attention"? | See open decision 2 |
| Phone HUD and header | Can a player reach ROOM and DIRECTIVES one-handed? Are the HUD's 26 px buttons usable? | Header 44 px on phones; HUD 26 px |
| Field Directives dock | Does the dock that opens over the terminal on first entry help or get in the way? | Opens over the top of the phone terminal by default |
| Interrupted rests | Is a stop for a contract expiry a fair, readable interruption? | Stops at 2160, 2520 or 2880 in probes |
| G0 playtest (#76) | Does the vertical-slice brief play as intended? | Pending since PR #85 |

The 3–10 in-game day run length (AGENTS.md) is judged in G4 and G8 by real play, not in G1.

## 7. What is genuinely left for G1

1. Answer open decisions 1–5 in section 5. Implement or drop each one.
2. Run the human gates in section 6 and record the evidence.
3. The browser acceptance script lives in the scratch area outside the repository, so it is not in CI. Commit it if the evidence should be reproducible from the repo.

## 8. Start of G2 (#78), identified only

The dependency-ready start is **player identity**, not procedural worlds.
- Identity needs nothing from G1 beyond the run lifecycle. `createSliceWorldState` already takes a `handle` option (default `CobaltXZ`), and the run schema already stores one (`world-state-schema.ts`).
- The gap is the new-run path: `game-shell.tsx` calls `createNewRunWorldState()` with no options, so every run is `CobaltXZ`. No UI or seed path sets a handle.
- Procedural worlds come after that. They need a named RNG stream per concern (`seeded-rng.ts` and `stateless-hash.ts` exist) and a content seam that accepts a generated roster in place of `instantiateWorldContent()`, plus the id, reachability and solvability checks in GAME_FIRST_REBOOT §4.

G2 has not been started.
