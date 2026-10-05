# Phase 8 P4 — Location + physical-life breadth

Parent: #26  
Depends on: P0–P3 delivered (D044–D047 / #48–#51).

## Goal

Broaden where the player can live and work without inventing a second location
system. Phase 6 already established the complete mechanic:

- `economy.housing` is the authoritative lease;
- physical presence is derived from that lease;
- travel costs world time;
- upkeep charges the held lease;
- capability flows through the ordinary rig fold;
- anonymity changes existing physical-retaliation exposure;
- housing kind is descriptive/presentation metadata, not a rules class.

P4 is therefore authored catalog breadth only.

## Breadth

The catalog grows from four to eight entries.

Existing Phase 4/6 entries remain byte-for-byte unchanged:

- Co-working Loft;
- Rented Lab Bench;
- Sleeper Unit (Outskirts);
- Basement Cot (Warehouse District).

P4 adds four fictional trade-offs:

### Night-Shift Office (Print District)

- kind: workspace;
- anonymity: quiet;
- travel: 30 minutes;
- upkeep: 45/day;
- capability: storage 1 / network 1.

A small connected workspace: quieter than the baseline/public options, but
weaker networking than the loft and no compute lift.

### Sublet Studio (Old Blocks)

- kind: residential;
- anonymity: quiet;
- travel: 45 minutes;
- upkeep: 35/day;
- capability: compute 1 / memory 1.

A cheaper, quieter partial alternative to the public rented lab, without its
storage or full compute lift.

### Archive Lockup (Freight Belt)

- kind: workspace;
- anonymity: hidden;
- travel: 120 minutes;
- upkeep: 80/day;
- capability: compute 1 / memory 1 / storage 3.

A costly hidden workspace that keeps useful storage while trading away the
lab's stronger compute and taking real relocation time.

### Cellar Studio (Outer Ring)

- kind: residential;
- anonymity: hidden;
- travel: 150 minutes;
- upkeep: 55/day;
- capability: memory 1 / network 1.

A hidden residential compromise between concealment-only safehouses and the
more expensive hidden workspace.

## Invariants

- no new command, event, state field, scheduler, RNG stream or persistence
  schema;
- no player rank input anywhere in location selection or leasing;
- every new entry is consumed by the existing generic catalog lookup;
- `derivePresence` remains the only location read;
- relocation remains symmetric distance in world minutes;
- safehouse listings remain concealment-only and add zero capability;
- `workspace` / `residential` / `safehouse` remain descriptive kinds, not
  gameplay subclasses;
- anonymity remains the existing public/quiet/hidden band consumed by physical
  retaliation;
- UI/projection receives listing price, kind, anonymity, travel and capability
  through the existing housing projection;
- legacy saves need no migration because they persist only the selected housing
  id and old ids are unchanged.

## Telemetry contract

P1's four scripted policies never execute a rent/lease command. Therefore P4
must not change their economy, threat, ending, rank, contract or exposure
outcomes. The only expected telemetry difference from the P3 report is authored
content breadth: `housingListings` increases from 4 to 8.

That comparison is a regression proof, not a new difficulty target.

## Verification

P4 tests pin:

- all eight ids are unique;
- all three housing kinds and all three anonymity bands remain represented;
- every new listing derives presence/capability through the generic systems;
- relocation to/from each new listing is symmetric;
- rank 1 and rank 999,999 can lease the same P4 listing;
- projection exposes the authored fields without adding authoritative location
  state;
- the two safehouses still contribute zero capability;
- telemetry reports eight housing listings and keeps P3 outcome distributions
  unchanged.
