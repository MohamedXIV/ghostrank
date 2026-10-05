# Phase 7 P6 — Bounded exotic capability

Parent: #25  
Depends on: D042 / Phase 7 P5 exceptional long-run pressure.  
Implementation branch: `chatgpt/phase-7-p6-bounded-exotic-capability`.

## Goal

Ship one genuinely late, rare, fictional exotic capability without turning
“quantum” into a second combat system, an attack unlock, or a universal success
button.

## Shipped artifact

The **Cryogenic Annealing Rack** is an off-market machine:

- catalog id: `box-annealing-rack`;
- one-time cost: 4,500 credits;
- capability: `compute 0 / memory 8 / vram 5 / storage 4 / network 0`;
- ordinary machine ownership, ledger, resale, naming and projection rules apply.

The name is fiction. P6 does not model a real quantum-computing workflow or
real cryptographic break procedure.

## Availability

The listing is derived from existing run history:

1. P5 must currently classify the run as **VETERAN**;
2. the player must own at least one self-authored workflow whose completed
   outcome is **clean**;
3. the rack must never have been purchased earlier in this run.

Rank, target rank, and the starting White/Black board are not inputs.

The Market omits unearned exotic stock. A player who guesses the catalog id and
uses `box buy box-annealing-rack` still crosses the same CommandBus check and
receives `EXOTIC_NOT_AVAILABLE`, so UI secrecy is not the rule.

## Bounded effect

P6 reuses the existing five-axis `HardwareCapability` vector and adds no new
effect type.

Zero compute and zero network are deliberate:

- survey speed does not change;
- inspect/escalate speed does not change;
- disengagement remains manual and unchanged;
- no target or command becomes newly legal;
- no success probability changes.

The rack instead widens the existing memory-driven discovery scope and supplies
VRAM/storage headroom for local models and software-building workloads. It is a
late convenience/scale artifact, not a power tier.

## One-shot provenance

There is no `exoticClaimed` state flag.

A successful purchase already writes an append-only machine debit to the value
ledger. That debit is authoritative proof the opportunity was claimed. Owning
the rack also counts as claimed, but selling it does not erase the historical
debit and therefore does not respawn stock.

Because owned machines and the ledger already round-trip through the canonical
save contract, the one-shot rule survives save/restore without a new migration.

## Interface parity

No P6-specific command is added:

- Terminal: `box buy box-annealing-rack`;
- GUI: ordinary machine BUY action;
- both produce the same `buyMachine` command.

When legitimately available, the Market labels the listing **EXOTIC** and
**one-shot off-market stock**. After purchase it is represented by the ordinary
owned-machine surface.

## Verification

P6 pins:

- ordinary runs neither list nor buy the exotic id;
- veteran history alone is insufficient without a clean authored workflow;
- warning/defective authored work does not qualify;
- rank and starting network do not alter eligibility;
- earned projection exposes the exact bounded capability and exotic tag;
- purchase reuses the normal machine event/ledger path;
- compute/network and operation action minutes remain unchanged;
- memory/VRAM/storage lift exactly matches catalog data;
- selling does not reset the one-shot claim;
- portable save/restore preserves the claimed state through existing ledger
  provenance;
- Terminal and GUI remain command-equivalent;
- normal web tests, typecheck, lint and production build stay green.

## Phase handoff

D043 records the governing contract. P6 is the final planned Phase 7 slice.
After exact-head green merge, #25 can close and Phase 8 / #26 becomes the next
gameplay phase.
