# Phase 7 P3 — Retirement outcomes and VANISHED

Parent: #25  
Depends on: P0 terminal contract (D037), P1 forced endings (D038), P2 voluntary retirement operation (D039).

## Goal

Turn P2's derived READY state into a real terminal retirement while preserving the project's core rule: the ending is earned from actual run history, not selected from the starting White/Black package, player rank, or a morality checkbox.

## Terminal action

READY is still non-terminal until the player explicitly closes the handle.

- Terminal: `retire finish`
- Underground UI: **CLOSE HANDLE**
- both routes emit the same `finishRetirement` command
- before READY the command returns `RETIREMENT_NOT_READY`
- at READY it calls the shared D037 `endRun`
- afterwards every gameplay command is rejected with `RUN_ENDED`

The finishing action consumes no extra world time. P2 already made the player survive the commit hour and cooling period.

## History-derived outcome

The classifier reads completed-contract history by the issuer's network plus existing reputation/consequence history. It never reads `player.rank` or `underground.playerNetwork`.

### VANISHED

VANISHED is intentionally narrow. The run must have:

- at least three completed contracts issued by White-network peers;
- zero completed contracts issued by Black-network peers;
- no `Opportunist` descriptor (no accepted obligation expired);
- no `Predator` descriptor (no repeated-escalation history);
- no catastrophic compromise record;
- no social unmasking retaliation.

A player who started on the Black board can still earn VANISHED by producing that history. A player who started White does not receive it for free.

This is the strongest coherent peaceful-retirement signal the current simulation can prove. It is not a claim that the game has modelled every moral consequence or real-world identity-cleaning step.

### RETIRED variants

Every other READY run can still retire successfully.

- **white-quiet** — more completed White-network work than Black-network work, without meeting VANISHED.
- **black-prosperous** — at least two completed Black-network contracts, more Black than White completions, no visible retirement pressure, and at least 500 credits left.
- **black-watchful** — the same Black-dominant history with retaliation, physical threat, or compromise history still hanging over the run.
- **black-quiet** — Black-dominant retirement without the prosperous or watchful tone.
- **mixed-exit** — no side clearly dominates the completed-work history.

These are ending tones, not power tiers. They change no mechanics after terminality.

## Projection and persistence

The authoritative terminal record remains D037's existing `WorldState.ending`: status, cause kind/id, and world minute. P3 adds no duplicate persisted morality/alignment field.

For a retirement ending, the player-safe projection derives:

- final status/label;
- structured retirement variant;
- one short in-fiction closing detail.

The variant/detail can be re-derived after save/restore from the final authoritative state and retained run history. Hidden relationship values, probe truth, investigation progress, actor ids, and starting package are not exposed by the final projection.

## Determinism

P3 has no new roll.

Two worlds with the same causal history produce the same retirement outcome regardless of:

- player rank;
- starting White/Black board;
- save/restore boundary;
- UI versus Terminal finish route.

## Safety boundary

The system remains fictional simulation state. It does not model real-world disappearance, identity laundering, evasion procedures, credential changes, travel routes, or operational-security instructions.

## Verification

Tests pin:

- finish rejected before READY;
- ordinary READY retirement terminates exactly once;
- rare VANISHED from coherent White-scene history;
- starting package does not hard-lock VANISHED or Black retirement;
- missed obligations / Predator history disqualify VANISHED;
- Black prosperous/watchful/quiet variants;
- White-quiet and mixed retirement;
- rank independence;
- terminal `RUN_ENDED` guard after finish;
- structured player-safe projection/TinyBase variant;
- save/restore preserves the derived final presentation;
- Terminal/GUI command parity.
