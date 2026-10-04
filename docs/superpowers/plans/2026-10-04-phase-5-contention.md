# Phase 5 P1 — Compute Contention (VRAM and Storage Become Live)

Issue: #23 — this slice carries the **constraints handoff from #22** ("real
compute/hardware constraints/contention"), pinned here by the kickoff plan
(`2026-10-04-phase-5-plan.md`).
Builds on: Phase 5 P0 (`2026-10-04-phase-5-models.md` — the assistant slot and
its factor), Phase 4 P1 (the duration path and its one-minute floor), P6/P7
(the pool the axes live in), and the design line this finally spends: "more
VRAM allows larger/faster local AI models"
(`docs/ECONOMY_PROGRESSION_AND_SKILLS.md`).

## Goal

Turn the two capability axes every catalog has been summing since Phase 4 P0 —
`vram` and `storage`, read by **no one** — into real consumers, so hardware
ownership becomes a **decision rather than a passive bonus**. Concretely: a
running *local* model now occupies VRAM and storage on the player's own rig,
and how well the rig's pool covers that footprint decides how much of the
model's advertised shortcut actually arrives.

The doctrine is load-bearing and unchanged: Phase 4 established that hardware
is *never slower than baseline* — a lift, never a punishment. So contention
does not tax the player. It taxes **the model's own shortcut**, sliding it from
its catalog factor toward ×1 — which is exactly the speed of running no model
at all. A starved local model simply stops helping, the way an unaffordable
lease or an unpaid license stops helping, and the remedies are the ones
`docs/AI_SYSTEMS.md` names: buy more VRAM/storage, stop the model, or rent the
speed from the cloud instead (cloud models run on the provider's hardware and
carry a **zero footprint** — that is their counterweight to the daily rent).

## The model

Catalog (P0's `model-catalog.ts`, extended):

- every `ModelListing` gains `footprint: { vram, storage }`; cloud entries are
  `0/0` (never contended), locals carry real numbers — `workhorse` 2/1, `tuned`
  4/2, scaling with size and speed.

New pure module `src/game/simulation/systems/contention.ts`:

- `modelPoolCoverage(footprint, pool) ∈ [0, 1]` — per-axis
  `min(1, have/need)` (a zero need is fully covered, so cloud scores 1 on any
  rig), and the model needs **both** axes, so the scarcer one bottlenecks:
  `min` across vram and storage.
- `contestedModelFactor(factor, footprint, pool)` — the advertised shortcut
  scaled by coverage: exactly `factor` at full coverage, `1` when fully
  starved, linear between. Always in `[factor, 1]` — mathematically incapable
  of landing a player below the no-model baseline.

No new state, no reservation, no bookkeeping: contention is **derived physics**
over the existing pool, deterministic like everything else, so saves, split
waits, and read order cannot desync it. This is why "pause the build" and
"drop model quality" needed no new commands — they are the already-shipped
stop/run/switch choices, and the P3 build queue inherits the same pool.

## Plumbing

One fold point, one optional parameter:

- `combinedActionDurationFactor(economy, pool?)` (tools.ts) — when a pool is
  passed and a modifier model runs, its catalog factor is first contested; a
  fully starved model contributes *no effect at all* (a ×1 term is skipped, so
  `combineFactors` sees exactly the licenses × tools stack). With no pool the
  function behaves exactly as in P0 — every existing caller and test untouched.
- The two real consumers pass the pool they already derive: the command bus's
  `rigActionMinutes` and `projectWorld`. `effectiveCapability`, `advanceUpkeep`,
  the ledger, and the model economics are untouched by construction — nothing
  bills for contention, a starved local model still runs free.
- `VisibleModelListing` gains `deliveredFactor` (what *this rig* would give the
  model) and `footprint`; the listings are what make the buy-vs-rent decision
  legible *before* spending: each local row shows `rig load 2 vram / 1 storage
  · your rig 0 / 1` and, when starved, "this rig delivers ×1". The hint frames
  the three-way choice: feed the pool, run it starved (harmless, useless), or
  rent from the cloud.

TinyBase `modelListings` rows gain `deliveredFactor`, `vram`, `storage` cells.

## Why this shape (the alternatives, weighed)

- **Tax the player instead?** A pool-wide slowdown would violate the standing
  "never slower than baseline" rule every Phase 4 slice repeats; only the
  model's own promised shortcut can be taken back.
- **Hard requirement (footprint > pool ⇒ model won't run)?** That would make a
  purchased model unusable — a gate, which #23's rules forbid; starvation is
  the same "stops helping, nothing breaks" pattern as a lapse.
- **Reservation state (`reservedVram`)?** It needs a lifecycle (reserve,
  release, save/restore, lapse-on-unpayable) none of which anything consumes
  yet, and it can desync; a pure fold over the pool cannot, and P3's builds can
  join the same `min` bottleneck when they arrive.

## Invariants (tested — `contention.test.ts` 20 tests; `models.test.ts` 28 and
`player-tools.test.ts` 26 re-run untouched, `world-projection.test.ts` fixture
extended)

- math: zero need covers 1, zero pool covers 0, coverage caps at 1, the scarcer
  axis bottlenecks, full coverage delivers the factor, half coverage keeps half
  the saving, starvation lands exactly ×1, the result never leaves
  `[factor, 1]` for any pool;
- cloud is never contended: survey stays 9 across GPU and storage purchases;
- the starter rig starves the workhorse to baseline ×1 (factor 1, survey 12)
  while *allowing* the run — help less, never block;
- one `gpu-entry` fits the workhorse: ×0.9 arrives, survey 11 (its compute does
  not touch survey, which reads network — the axes stay honest);
- the tuned model lifts in stages: starved → half-fed (`gpu-entry` covers VRAM,
  storage bottlenecks 0.5, delivered 0.9) → fully fed (`storage-array`, ×0.8);
- a rack counts: the Attack Cluster's own vram/storage covers the workhorse —
  machines are pool, not just model;
- running a starved model never lengthens any action versus no model;
- licenses are immune: starved ⇒ factor is exactly the license's 0.85; fed ⇒
  0.85 × 0.9 = 0.765, survey 10 — one shared floor;
- determinism: repeated folds agree, the pool is untouched by running, and a
  starved local model bills nothing across three days;
- projection: listings show factor/delivered/footprint, delivered *moves with
  the rig*; TinyBase mirrors the cells and the `rig.assistant` row reports the
  factor the fold actually used (1 starved → 0.9 fed).

## Out of scope (later slices)

- the pool is a shared sum with a single contender: today only the running
  local model asks anything of vram/storage, so contention is model-vs-rig.
  True multi-tenant pressure — several workloads holding the finite pool at
  once — becomes visible with P3's build queue, the designed next holder;
- leases as pool: the two housing entries carry `storage` numbers that now
  count (the fold sums everything) but no housing entry carries vram — a lab
  with accelerators is a content beat, not a mechanic change;
- AI analysis quality (P2) and spec→IR builds (P3) — this slice only makes the
  two axes *mean* something, which is what #22 transferred here.
