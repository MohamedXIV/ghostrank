# Phase 4 P0 — Economy Substrate: Money, Value Ledger, and Hardware

Issue: #22
Builds on: Phase 3 complete (#21)

## Goal

Give the run a wallet and a rig. This first Phase 4 slice lays the money and
hardware substrate every later economy system (compute budgeting, housing
costs, the software marketplace, tool authorship, buying/selling tools) builds
on, and it closes the promise Phase 3 deferred: **delivering a contract now
pays.**

Everything is a fictional abstract model. Money is a single fictional currency
(**credits**, shown as `cr`). Value moves through an explicit ledger, which is
the seed of the digital-value graph — never an invisible money bar.

The non-negotiables still hold: hardware improves capability, scale, speed, and
convenience; it is **never a level gate**. Rank is never an input to any economy
rule. A broke player on modest gear can still attempt any target.

## Money

`WorldState.economy`:

- `credits` — the player's balance, a non-negative integer.
- `ledger[]` — every value transfer: `id, worldMinute, direction (credit|debit), amount, balanceAfter, cause {kind, id}, counterparty`.
- `hardware[]` — owned hardware instances: `id, catalogId, acquiredWorldMinute`.

`credits` can never go negative; there are no debt mechanics in P0.

### Sources and sinks in P0

- **Source:** delivering a contract pays credits (see payouts).
- **Sink:** buying hardware from the catalog.

Recurring costs (rent, upkeep, power) and the software/tool market are later
Phase 4 slices, not P0.

## Contract payouts

Payout is a pure, deterministic function of the contract — never random, never
rank-dependent:

- `recon-report`: `80 + 40 × requiredServices` credits.
- `intrusion`: `260` credits.

Delivery records a `credit` ledger entry with `cause {kind: "contract", id}` and
the issuer as `counterparty`, alongside the existing trust/rank/vouch rewards.
Accepting, declining, and missing a contract move no money in P0.

## Hardware catalog

Data-driven content in `src/content/hardware-catalog.ts`, kept outside system
logic. Each item has `id, label, category, cost`, and a `capability`
contribution across five axes drawn from the design docs:

- `compute` (CPU — compilation/analysis),
- `memory` (concurrent workload capacity),
- `vram` (local model capacity),
- `storage` (archives/models/backups),
- `network` (monitoring/throughput).

The player's **rig capability** is the sum of the capabilities of everything they
own. In P0 capability is accumulated and surfaced (readable, persisted) but not
yet consumed; compute budgeting, builds, and multi-machine grouping are later
slices that read this same profile. This mirrors how Phase 3 P0 established
relationships before contracts consumed trust.

The starting rig (`rig-starter`, a Secondhand Workstation) is seeded owned for
free at run start; it is also purchasable like any other item, so it can never be
farmed for free capability.

## Commands

- `buyHardware { catalogId }` — Terminal `buy <catalogId>`, GUI buy button. Same
  typed command through both interfaces. Costs no world time.

Errors: `HARDWARE_NOT_FOUND`, `INSUFFICIENT_CREDITS`.

## Events

- `ValueTransferred { entryId, direction, amount, balanceAfter, causeKind, causeId, counterparty, worldMinute }`
- `HardwareAcquired { hardwareId, catalogId, cost, worldMinute }`

## Projection

`economy`: `credits`, aggregate rig `capability`, owned `hardware[]` (label +
category resolved from the catalog), and the `ledger[]` (newest first, cap 30,
counterparty resolved to a handle, `market` for catalog purchases). No hidden
truth is involved — the whole economy is player-observable. TinyBase gets a
`wallet` credits cell, a `rig` capability row, and `hardware` / `ledger` tables.

## Persistence

`WorldState.economy` joins the same validated save contract. Saves written
before Phase 4 load with an empty economy (`credits: 0`, no ledger, no hardware)
rather than fabricating a rig. Capability is derived and never stored.

## Invariants (tested)

- credits never go negative; an unaffordable or unknown purchase changes nothing,
- delivering a contract credits the exact payout with provenance, and payout scales with objective/required services,
- buying deducts cost, adds an owned instance, records a debit with provenance, and raises rig capability,
- rank never gates a purchase and a purchase never changes rank,
- owning hardware never blocks observing or operating any target (no level gate),
- same seed + commands => identical economy; restore-and-continue equals uninterrupted play,
- projection exposes the wallet/rig/ledger without hidden fields,
- legacy saves load with an empty economy; the schema rejects negative credits and bad directions.

## Out of scope (later Phase 4 slices)

Compute budgeting and contention, multiple named machines, housing/location and
recurring power/upkeep costs, the software marketplace, tool authorship and
provenance, buying/selling player tools, and the richer multi-hop digital-value
graph.

## Provisional balance

Starting credits, catalog prices, capability values, and contract payouts are
first-pass tuning. The exact ranking/pricing curve remains an open decision in
`DECISIONS.md`.
