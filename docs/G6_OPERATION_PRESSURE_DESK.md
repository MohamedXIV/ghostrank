# G6 — Operation Pressure Desk

Status: implemented on `feat/g6-operation-pressure-desk` from `main` `c9ec53a`.
Parent: #82 (G6 game-first UX). Initiative: #75. Human playtest: **NOT RUN**.

## What the player gets

While an operation is open, the Recon panel shows one instrument instead of
separate stage and action text:

- **Target and clock:** the target, the world clock, and minutes spent on target.
- **Signal path:** a patch-bay strip showing RECON or INTRUSIVE. Escalation is
  the only transition on the strip.
- **Readouts:** footprint level, trace count and observed service evidence.
- **Next step:** one sentence saying what to do next and what it leaves behind.
- **Actions:** ESCALATE (recon only) and DISENGAGE. ESCALATE is disabled with
  its reason when blocked.
- **Receipt:** what the last action actually changed, as a short log.

Idle sessions keep the existing line: "No active operation. Open one from an
observed target profile."

## Authority

- The CommandBus decides every action. React never evaluates mechanics.
- Without the Nightshade briefing, ESCALATE is locked by the same evidence rule
  the command enforces (`SERVICE_EVIDENCE_REQUIRED`). The lock is a hint only: a
  refused command still returns its code and the receipt reports it.
- With the Nightshade briefing, the authoritative preview's `blockedBy` decides,
  and escalation and disengage still go through the briefing's confirmation.
- Receipts never contain invented costs. Time, trace and footprint lines are a
  diff of player-visible projection between the state before an action and after it.
- Time is reported only alongside a real change (open, close, stage, evidence,
  machines, traces or footprint), so a running clock produces no receipt.

## Files

- `src/components/game/operation/operation-pressure-model.ts`: pure view model,
  blocker copy and change description.
- `src/components/game/operation/operation-pressure-desk.tsx`: presentation.
  Receipts are coalesced over a 120 ms settle window so one command yields one
  complete receipt.
- `src/components/game/computer-desktop.tsx`: `ReconAppBody` mounts the desk in
  place of the old operation block. The clock, footprint and Network Map are unchanged.
- `src/app/globals.css`: desk styles, with a reduced-motion override.
- Tests: `operation-pressure-model.test.ts`, `operation-pressure-desk.test.ts`.
- Browser proof: `scripts/browser-smoke/g6-operation-desk-smoke.mjs`.

## Accessibility

- Actions are native buttons with a 40 px minimum height and a visible focus ring.
- Disabled escalation points `aria-describedby` at the guidance sentence.
- Receipts use `role="log"` with `aria-live="polite"`. `role="status"` is avoided
  because Network Mapping already queries that role inside Recon.
- Every state is carried by text or a glyph (●, ✓, ✕), not colour alone.
- Under reduced motion (system or in-app setting) the receipt animation is removed.
- High-contrast mode was not separately verified.

## Known blockers and dependencies

1. **Stale operation row after disengage (pre-existing on `main`, outside G6 scope).**
   The authority clears the operation, and the runtime projection reports `null`.
   But `src/stores/projection/world-projection.ts` writes an empty operation table
   with `setTable("operation", {})`, which leaves the `active` row in place, so the
   desk keeps showing the closed operation. A runtime-level reproduction on
   `main` and on this branch shows the row remains after a successful disengage.
   Fix: remove the row in that empty branch, for example `store.delTable("operation")`.
   That file is outside the G6 allowed scope, so it is reported here rather than
   changed. The smoke records this as a known blocker and turns it into a normal
   check once the store clears the row.
2. **Generic escalate and disengage costs are not projected.** Only the Nightshade
   briefing exposes `minutes` and `traceWeight` previews. Outside it the desk says
   the cost is reported when the action runs. A player-safe preview for generic
   operations would be a projection change (`src/game/simulation/projection/**`),
   owned by GPT-6's stream.
3. **Floating Field Directives overlap the Recon window** at 1280 px and 390 px.
   This predates G6 and can cover the desk's clock header. It is a layout issue
   in the directives surface, not in the desk.

## Evidence

- Unit: 18 desk and model tests; full suite 1,367 / 1,367 on Node 24.
- Typecheck and production build pass; lint has no errors (one pre-existing
  warning in `postcss.config.mjs`).
- Browser (`g6-operation-desk-smoke.mjs`, Chromium): 56 checks pass at 1280 px,
  390 px and reduced motion, with 3 known blockers (item 1). Real actions through
  the GUI: open, survey, inspect, escalate, then keyboard disengage. Receipts are
  observed after each one.
- Regression: `g3-network-map-smoke.mjs` 134 / 134, same as `main`.
- The existing `g3-slice-smoke.mjs` shows 30 failing checks, identical to
  untouched `main` (pre-existing; not caused by this branch).
