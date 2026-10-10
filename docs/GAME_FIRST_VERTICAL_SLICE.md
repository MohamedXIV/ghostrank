# Game-First G0 — Game-Feel Audit and Vertical-Slice Brief

**Issue:** #76 (G0), parent #75.
**Status:** audit and design brief. The G3 build of §5 and §6 is implemented as the Nightshade briefing (D071, §10). The human playtest gate in §5 and §6 is NOT RUN.
**Decision gate:** the north-star slice below is **not validated** until a human playtester completes it. A passing test suite does not satisfy this gate.

## 1. Method and limits

The audit traces what the code does, not what the screens claim:

- A headless run drives the real `CommandBus` on the authored `nightshade` target (`createSliceWorldState()`, default seed) and records each command's result, world minute and emitted events. The trace is reproducible, but it covers one scripted path, not every branch.
- Failure paths were checked by reading how error codes reach the terminal (`formatRichError` in `src/components/game/terminal/rich-terminal.ts`).
- Time costs were read from the trace, not from the source.

No browser playtest was run. Anything about how a human experiences pacing or tension is an inference from this evidence and must be confirmed in playtests.

## 2. Verified action → feedback → consequence timeline

Scripted path: observe → open → survey → inspect → escalate → inspect (vault) → disengage → wait 6h.

| # | Command | Result | World minute | Immediate feedback | Consequence visible in the same command |
|---|---|---|---|---|---|
| 1 | `observeTarget nightshade` | ok | 0 → 0 | `TargetObserved` | none |
| 2 | `openOperation nightshade` | ok | 0 → 0 | `OperationOpened` (stage `recon`) | none |
| 3 | `surveyTarget nightshade` | ok | 0 → 12 | `MachineObserved ns-relay` | 12 minutes spent |
| 4 | `inspectMachine ns-relay` | ok | 12 → 20 | `ServiceObserved ns-signal` | 8 minutes spent |
| 5 | `escalateOperation` | ok | 20 → 25 | `OperationEscalated` (recon → intrusive) | `TraceRecorded` with severity **high** |
| 6 | `inspectMachine ns-vault` | **fail** `MACHINE_NOT_OBSERVED` | 25 → 25 | none | none; no state change |
| 7 | `disengageOperation` | ok | 25 → 28 | `OperationDisengaged` | `TraceRecorded` (elevated), `OpponentReactionTriggered` (defensive-watch, footprint 5), `RelationshipChanged` (trust −10), two `RumorSpread` events via other actors: 15 events in total |
| 8 | `advanceTime 360` | ok | 28 → 388 | `WorldTimeAdvanced` | `InvestigationAdvanced`, `UndergroundActivity` ×2+, a forum post, `ActorRankChanged` for another actor: 18 events in total |

Terminal rendering of failure (step 6), as the player sees it:

    machine_not_observed // Type 'help' to review valid command formats

## 3. Why it currently feels like a web app

These causes are verified in the trace or in the code paths it exercised.

1. **Operations are atomic command results.** Survey, inspect and escalate each return a deterministic result immediately. The player chooses which command to type next and never works inside an operation. The only decision is ordering.
2. **The one real dependency is a dead end.** Step 6 fails because `ns-vault` was never observed. The only feedback is a raw code plus a `help` hint that suggests a syntax problem. The missing clue is never shown in the world.
3. **Risk is a log entry.** Escalation records a `high` trace with no preview, confirmation or stated cost. The player learns the price only afterwards, in the event stream.
4. **Consequences are a cascade, not a story.** Disengaging produces 15 events, but nothing presents them as a chain of cause and effect. This is the most promising material for drama, and it is currently unseen.
5. **Time is either tiny or only a button.** Actions cost 5–12 minutes. Ecosystem pressure arrives only when the player explicitly runs `advanceTime`. There is no sleep, fast-forward or queued work (G1).
6. **Identity and world are fixed.** The default handle is `CobaltXZ` and the authored roster is cloned for every seed (#78). Two runs feel the same at the level of targets and machines.
7. **Time-gated failure is silent.** Steps 3–5 never fail, so the player never experiences a meaningful loss within an operation. Loss exists at the run level, but this path did not reach it.

## 4. Keep / deepen / replace / remove

| Feature | Verdict | Reason |
|---|---|---|
| Deterministic `CommandBus` and event log | **Keep** | Required by AGENTS.md and the G1 equivalence goal. |
| Ecosystem ticks, NPC reactions, rumors, relationship changes | **Keep** | Consequences exist; they need presentation, not rewriting. |
| Per-action time costs (survey 12m, inspect 8m, escalate 5m) | **Keep, retune** | Cost is real but too small to create tension. Tune in G3. |
| Trace footprint and severity model | **Deepen** | Show the expected trace cost before escalation, not after. |
| Recon → intrusive stage model | **Deepen** | Make each stage a sequence of choices and partial outcomes, not one command. |
| `MACHINE_NOT_OBSERVED` and similar prerequisite failures | **Deepen** | Turn each prerequisite into a diegetic clue. Keep the code. |
| Raw uppercase error codes in the terminal | **Replace** | Use in-world messages, while keeping the code as an identifier. |
| Single `surveyTarget` / `inspectMachine` as the whole operation | **Replace** | Becomes one step inside an interactive network sandbox (G3). |
| Fixed authored roster and default handle | **Replace (G2)** | Scenario and seed selection, with the canonical roster kept as a preset. |
| `advanceTime` as the only time control | **Replace (G1)** | Shared scheduler with sleep, fast-forward and queued jobs. |
| Command-result-only feedback and card-style results | **Replace (G6)** | Embodied desk after a proven slice. Do not wallpaper this first. |
| Any single-number success or difficulty display | **Remove** | Conflicts with the no-universal-roll and no-difficulty-score rules. |
| Simulation mechanics | **Remove nothing** | The gap is in play, not in the simulation. |

## 5. North-star vertical slice (20–30 minutes)

Target experience: one hard, authored-but-varied operation against `nightshade`. It is short enough for one sitting and produces a clear win, a clear loss, or a clear retreat.

### Setup
- The player picks a handle and a scenario before starting (G2). For the first playtest this can be the canonical preset with a typed handle.
- An opening partial clue arrives through a message or forum post. It points to `nightshade`, but not to a single route.

### Objective
Produce an infrastructure map of `nightshade` that is sufficient for a contract delivery, while keeping trace cost below the point where the operation is forced to end.

### Two viable routes

| Route | Method | Cost | Risk |
|---|---|---|---|
| **A — Quiet intelligence** | Stay in recon. Use survey, observed services and messages to identify the relay path, and use a clue to reach the archive without intrusion. | More minutes; several information checks. | Low trace; the target may still notice slow activity. |
| **B — Intrusive** | Escalate early and reach the vault directly. | Fewer minutes. | High trace on escalation, and a faster target reaction. |

Both routes must reach the objective. Neither should be a single button press.

### Decision points (at least three, each with a distinct consequence)

1. **Route choice:** when a clue is first available, the player chooses whether to stay in recon or escalate. The consequence is the trace severity and reaction speed.
2. **Preview or commit:** before escalation, the player sees the expected trace cost. They may proceed, collect one more clue, or disengage. Preview information must not reveal hidden truth, only the cost the player can reason about.
3. **Time tradeoff:** the player can wait for a scheduled investigation to finish, or act now. Waiting lets NPCs act, and the player sees what changed.

### NPC countermove
After disengaging or after sustained probing, the owner of `nightshade` takes a visible defensive action (watch, rumor or a changed login pattern). The player can see the evidence and must respond to it in a later decision.

### Time tradeoff
A survey or inspection costs minutes. A wait costs hours and lets investigations and NPC turns advance. The tradeoff is explicit: time spent in the slice is time the world uses against the player.

### Loss state
Loss comes from a visible chain of causes. The slice ends with a forced ending if the trace crosses a threshold, or with a retreat if the player disengages with a high footprint. A postmortem should show the chain (the design doc's "Day 2, Day 4…" model). No unexplained coin flips.

### Success and failure criteria
- Success: infrastructure map complete and delivered, with the trace below the forced-ending threshold.
- Partial success: the map is incomplete, but a useful clue is recorded.
- Failure: forced ending, or a retreat that leaves the target alerted.

## 6. Testing checklist for the G3 build

- Each route is completable through the command model, with a deterministic test per route.
- Each prerequisite failure produces a diegetic clue, not only an error code.
- Escalation preview matches the trace actually recorded.
- The NPC countermove is observable in the player-facing projection.
- Terminal and GUI invoke the same commands and produce the same world time.
- At least one human playtester completes the slice unaided and reports what they tried, what they expected and whether they had a meaningful choice.

## 7. Benchmarks: transferable mechanics vs inappropriate complexity

| Reference | Transferable | Not for this slice |
|---|---|---|
| EXAPUNKS (from `GAME_FIRST_REBOOT.md` §9) | Bounded puzzles with several valid solutions | Programming every action |
| NITE Team 4 (same section) | Clear investigative tasks | Military theme |
| Shadows of Doubt (same section) | Connected evidence and routines | Full city simulation |
| Grey Hack (same section) | Machines and tools with depth | Multiplayer dependency |
| hackmud (same section) | Scripts and an unpredictable economy | Requiring scripting from every new player |
| Bitburner (same section) | Resource budgets | Offline passive progression |

Uplink and Hacknet are also relevant references for mission-based hacking and in-terminal puzzles. They are not summarized here, to avoid unverified claims about their mechanics.

## 8. Dependency consequences

- **G1 (#77)** supplies sleep and fast-forward, which the time tradeoff depends on.
- **G2 (#78)** supplies handle and scenario selection before the slice starts.
- **G3 (#79)** is the first build target and implements sections 5 and 6.
- **G6 (#82)** should not start before G3 has been playtested.

## 9. Open questions for the playtest gate

- Is a 20–30 minute session the right length for the first slice?
- Does the preview-before-escalation design remove too much uncertainty?
- Which route do novice players choose first, and does it fail for a reason they can name?

## 10. G3 build status (D071)

The build is the Nightshade briefing. It runs in the scene `nightshade-slice` and is gated on `world.slice`, so canonical runs keep their rules. Terminal and desktop both call the same commands. The rules live in `src/game/simulation/systems/nightshade-slice.ts`.

Checked against §5 and §6:

| Requirement | Status |
|---|---|
| Two routes, each completable through the command model | Built and tested. Quiet (recon, broker routing at the boundary, delivered at footprint 3) and intrusive (escalate with the vault revealed, delivered under watch at footprint 5). Both are tested headlessly and played through the UI in the browser smoke. |
| At least three decision points with distinct consequences | Route choice after the broker read, preview or commit with cancel and confirmation, and waiting for the boundary or acting now. Each changes footprint, watch or the outcome. |
| Preview or commit before escalation | Built. The preview shows the cost the player can reason about: trace, minutes, footprint after, and watch and review timing. It never shows hidden state. |
| NPC countermove observable in the projection | Built. The watch shows from footprint five. The review rotates the vault off the map, with a notice and the map reduced to one machine. The player can re-read the broker to answer it. |
| Loss state from a visible chain of causes | Built. Burn at footprint eight, retreat while watched, lock-out after the review, and expiry at the window's end. Each outcome is recorded with its cause. |
| Diegetic clue for each prerequisite failure | Built for the slice's own prerequisites (`SLICE_FAILURE_CLUES`). Other codes still show the raw code. |
| Escalation preview matches the recorded trace | Built and tested on both routes. |
| Terminal and GUI invoke the same commands and produce the same world time | Built. Both go through `CommandBus.execute`. The browser smoke runs `brief`, `op preview`, `op escalate` and `op escalate confirm` in the terminal and checks the result on the desktop. |
| At least one human playtester completes the slice unaided | **NOT RUN.** This is the open gate. |

Gaps the playtest should look at, in priority order:
- Route tuning. The trace weights, the watch threshold, the burn line and the 360-minute review boundary are untuned. The quiet route waits up to six game hours, which may not fit a 20–30 minute session.
- The opening clue is a clue at run start, not a message or forum post as §5 suggests.
- The owner's response is a watch and one review rotation. Rumour and changed-login responses are not shown in the briefing.
- The confirmation panel does not pause the clock.
- There is no partial-success ending. A briefing with an incomplete map stays open.
- Generated scenes have no briefing.
