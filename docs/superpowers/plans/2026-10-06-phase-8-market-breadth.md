# Phase 8 P5 — Market breadth

Parent: #26  
Depends on: P0–P4 delivered in sequence (D044–D048 / #48–#52).

## Goal

Broaden the player's equipment/software/assistant choices without adding a
parallel progression system. P5 is authored catalog breadth only: every new
entry must flow through the existing purchase/rent/run/build/projection and
contention systems.

## Breadth

P5 expands the current catalogs:

- hardware: 6 → 8;
- machines: 5 → 7;
- models: 5 → 7;
- player-authored tools: 3 → 5;
- software licenses: 3 → 5;
- self-built workflow specs: 3 → 5.

Housing remains P4's 8 listings.

### Hardware

- **Balanced Compute Module** — compute 2 / memory 1 at 550 credits;
- **Memory Accelerator** — memory 1 / VRAM 3 at 1,200 credits.

These are ordinary component purchases. They add no category-specific rule.

### Machines

- **Archive Node** — storage-heavy whole box with modest compute/memory/network;
- **Model Host** — memory/VRAM-heavy whole box for local-model/build contention.

Both are ordinary non-exotic machines and use the existing buy/rename/sell
path. The Phase 7 Cryogenic Annealing Rack remains the only exotic listing.

### Models

- **Long-Context Class API** — cloud rental, factor 0.8, high context;
- **Reliable Compact 7B** — local property, factor 0.93, low footprint,
  reliability 5, authored by LATTICE.

Cloud/local economics, ownership, daily billing, contention and author
counterparty routing are unchanged.

### Player tools

- **Map Stitcher** by VESPER — memory/storage/network capability lift;
- **Trace Comparator** by LATTICE — action-duration factor 0.92.

They are ordinary one-time authored property and use the existing resale/value
graph rules.

### Software

- **Indexed Storage Suite** — memory 1 / storage 3, 50 credits/day;
- **Batch Scheduler** — action-duration factor 0.9, 90 credits/day.

They use the existing license enable/disable and daily-upkeep path.

### Workflows

Each new premium license has a self-built equivalent with the exact same
`SoftwareEffect`:

- **Local Storage Index** replaces Indexed Storage Suite;
- **Self-Built Batch Scheduler** replaces Batch Scheduler.

Build time, footprint, frozen quality outcome, assistant requirement and
delivered-effect degradation all reuse the existing Forge system.

## Invariants

- no new command, event, state field, RNG stream, capability axis, unlock gate
  or persistence schema;
- player rank never affects listing visibility, affordability rules,
  acquisition, activation, model running or building;
- existing catalog entries remain unchanged;
- every new entry uses an existing effect/capability shape;
- cloud models remain rent with zero local footprint;
- local models remain owned property and contend for rig resources;
- authored tools/models keep named value-graph counterparties through existing
  ledger routing;
- self-built workflows match the license effect they replace;
- exotic availability remains Phase 7 P6's separate derived rule;
- stale catalog ids remain inert under the existing lookup conventions.

## Telemetry contract

The P1 policies do not buy hardware, machines or tools, enable software, run
models, or build workflows. Therefore P5 must not change any 32-seed scenario
outcome, economy, ranking, threat or exposure result.

The only expected report delta is authored-content breadth:

- hardwareListings = 8;
- housingListings = 8;
- machineListings = 7;
- modelListings = 7;
- playerToolListings = 5;
- softwareListings = 5;
- workflowSpecs = 5.

Any other telemetry delta is a regression, not intended tuning. P6 remains the
explicit alpha-calibration slice.

## Verification

P5 tests pin:

- exact catalog counts and unique ids;
- all new listings reach the existing player projection;
- representative acquisition/activation paths are rank-independent;
- cloud vs local model economics remain source-driven;
- every new workflow references a real license and matches its effect exactly;
- a new workflow commissions through the ordinary Forge command path;
- P1 telemetry reports the expanded authored counts and otherwise remains
  outcome-identical.
