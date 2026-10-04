# Economy, Progression, and Skills

## Progression philosophy

The most important progression is player knowledge.

Character growth exists to improve efficiency, scale, quality, and automation. It must not decide whether a knowledgeable player is allowed to attempt an action.

There are no target level requirements.

## Money sinks

Money is useful because the player can invest in:

### Hardware
- CPU,
- memory,
- GPU/VRAM,
- storage,
- network hardware,
- portable machines,
- secondary workstations,
- servers,
- cooling/power support.

### Compute
- rented compute,
- AI subscriptions,
- local AI models,
- temporary high-performance capacity.

### Software
- premium tools,
- specialist packages,
- updates,
- licenses within fictional markets,
- datasets,
- analysis packages.

### Infrastructure
- relays,
- remote simulated machines,
- storage,
- backups,
- communication channels,
- monitoring.

### Physical life
- rent,
- short-term safe locations,
- relocation,
- better connectivity,
- power reliability,
- physical security,
- space for hardware.

### Information and relationships
- intelligence,
- introductions,
- rumors,
- specialist services,
- contract access.

## Hardware is capability, not item level

Components have concrete constraints.

Examples:
- more RAM allows larger concurrent workloads,
- more VRAM allows larger/faster local AI models,
- CPU affects compilation and analysis workloads,
- storage affects archives/models/backups,
- network hardware affects monitoring and throughput.

An expensive workstation can also create disadvantages:
- cost,
- power draw,
- heat/noise,
- physical footprint,
- difficulty abandoning it,
- incentive for theft,
- stronger attachment to one location.

A skilled player with modest hardware can defeat a wealthy target by exploiting a genuine simulated weakness.

## Crypto-like economy

Digital currencies are represented as transaction graphs, not anonymous money bars.

Different fictional asset classes can vary in:
- liquidity,
- volatility,
- visibility,
- exchange friction,
- acceptance,
- tracing difficulty,
- counterparty risk.

The player may inspect and reason about value-flow graphs.

The game does not teach real laundering or evasion techniques. Real protocols and operational methods are abstracted or fictionalized.

## Quantum capability

Quantum computing is a rare late-game/exotic resource, not a consumer upgrade.

Possible sources:
- research institutions,
- corporate laboratories,
- state infrastructure,
- rare underground compute brokers.

It may interact with fictional legacy cryptography and stored encrypted archives. Some data can be valuable to capture now and analyze later when capability improves.

Post-quantum systems and migration create a moving landscape rather than Quantum = instant win.

## Proficiency model

Visible skill should use descriptive bands rather than a gamey 0–100 score where possible:

- Unfamiliar
- Familiar
- Competent
- Strong
- Expert

Candidate domains:
- Systems
- Networking
- Software Engineering
- Reverse Engineering
- AI Engineering
- Hardware/Operations

Language familiarity can exist beneath Software Engineering:
- Python-like scripting,
- Rust-like systems language,
- TypeScript/JavaScript-like tooling,
- C-like low-level work,
- shell/workflow composition.

Names may remain recognizable or be lightly fictionalized depending on tone.

## What proficiency affects

Proficiency may improve:
- development time,
- requirement quality,
- defect detection,
- test quality,
- maintenance cost,
- AI prompt/specification quality,
- ability to understand generated warnings,
- workflow ergonomics,
- resource efficiency.

It should not cause:
- Action unavailable because Python 41 is required,
- impossible targets becoming possible only after leveling,
- automatic victory against lower-skilled NPCs.

## Learning

Proficiency grows from relevant activity rather than generic XP.

Examples:
- building and maintaining software improves engineering familiarity,
- manually composing workflows improves systems fluency,
- operating models improves AI engineering,
- studying/buying/repairing hardware improves hardware knowledge.

Growth should be slow enough that a run's identity matters but never become the primary source of mastery.

## Toolsmith career

The player can become known for software without selecting a Toolsmith class.

They may:
- create a useful tool,
- sell or license it in fictional markets,
- release free versions,
- maintain updates,
- build a reputation,
- have others misuse it,
- face malicious forks,
- discover their software on enemy systems.

Tool authorship is simultaneously income, prestige, and exposure.

## Implementation status (Phase 4 P0–P6)

The economy substrate is live through P6. This section describes what the
simulation actually does today; the sections above remain the design target for
later slices.

- **Wallet and ledger.** The player holds a single `credits` balance and an
  append-only value ledger. Every movement records its direction, amount,
  resulting balance, cause (`contract`, `hardware`, `housing`, `upkeep`,
  `license`, or `tool`), and counterparty. Credits can never go negative: a
  transfer that would take the balance below zero is rejected and mutates
  nothing. There is no debt.
- **Income.** Contract delivery is the first income source and pays a
  deterministic amount — `80 + 40 × requiredServices` for a recon report, `260`
  for an intrusion. Payout is never random and never rank-dependent.
- **Hardware.** A data-driven catalog (`src/content/hardware-catalog.ts`) spans
  five capability axes: compute, memory, vram, storage, network. Every run starts
  with a free secondhand workstation; upgrades are bought with credits through the
  `buyHardware` command, shared by Terminal (`buy <catalog-id>`) and the Market
  app, and costing no world time.
- **Capability, not level.** Rig capability is *derived* — the sum of owned
  hardware, the current lease, capability-bearing licenses, and owned player
  tools (see P3/P4/P5) — it is never stored and never gates a target or a
  purchase.
- **Compute budgeting (P1).** Capability's first consumer is operation speed:
  survey reads network, inspect/escalate read compute, and an action costs
  `max(1, ceil(base / capability))` world minutes above baseline (the starter
  rig sits exactly at baseline, so it pays the untouched Phase 2 base table).
  Disengagement is a deliberate manual exit and never scales. This is the
  money-vs-time trade: hardware buys elapsed time back, requirements and
  outcomes are untouched, and a weak rig is never slower than baseline. The
  Market app shows the rig's current per-action minutes.
- **Workload scale (P2).** The memory axis decides how much one pass of
  scoped work covers: `discoveryScope = max(1, floor(memory))`, so a survey
  can discover several machines and an inspection several services in one
  action, charging one pass's duration. The starter rig sits at scope 1 — the
  original one-item-per-pass rhythm. Breadth, never a gate: every item is
  discoverable on any rig; modest hardware just needs more passes, each
  costing its own time. Market shows items-per-pass next to per-action
  minutes; both halves of the money↔time trade are visible before buying.
- **Housing and recurring costs (P3).** The wallet gains its first *sink* that
  turns credits from a one-shot purchase pool into a strategic flow. A lease
  (`src/content/housing-catalog.ts`) adds capability to the rig while it is held
  — a co-working loft lifts connectivity, a rented lab bench lifts compute, memory
  and storage — so it feeds the same P1 speed and P2 breadth consumers rather than
  inventing new ones. Signing, switching, or breaking a lease moves no credits;
  cost accrues only when a whole world-day boundary is crossed (`advanceUpkeep`
  levies the daily cost at fixed boundaries, so it is deterministic and
  split-invariant across chunked waits). If a boundary cannot be paid the player is
  simply moved out — housing returns to the free baseline with no charge for that
  boundary, no debt, and no penalty beyond losing the capability lift. Housing is
  therefore always a lift, never a gate or a punishment; the Market app lists
  locations with MOVE IN / MOVE OUT and shows the current daily upkeep.
- **Software marketplace (P4).** A second recurring sink that is *stackable*:
  premium tool licenses (`src/content/software-catalog.ts`) make the same rig
  more productive — capability tools (a monitoring suite lifts network, an
  automation framework lifts memory/network) fold into the same effective
  profile, and an efficiency tool (an analysis pipeline) multiplies derived
  hardware action minutes by a discount factor, still respecting the
  one-minute floor. Enabling (`use <id>`) and stopping (`stop <id>`) a license
  cost nothing; the daily fee accrues only at world-day boundaries through the
  same `advanceUpkeep` that also bills the lease — lease first (landlord),
  licenses after (vendor), deterministic and split-invariant. Each obligation
  is all-or-nothing: an unpayable license lapses just that one tool with no
  debt and no penalty, and can be re-run later. Software is always a lift,
  never a gate; the Market app lists tools with RUN / STOP and folds their cost
  into the wallet's combined daily upkeep.
- **Tool authorship and trading (P5).** Authored tools (`src/content/player-tool-catalog.ts`)
  are the opposite economic shape from licenses: **property, not rent**. Each is
  credited to a named author handle and bought outright with a one-time debit —
  recorded on the ledger against the author, the first person-to-person artifact
  edges in the value graph — and there is **no recurring fee**, so a held tool
  can never lapse or bill. Selling a copy credits back half of what was *paid*
  through an offline fence (never re-valued by later catalog retuning). Tools
  reuse the exact license effect shapes, so a capability tool folds into the same
  `effectiveCapability` and a modifier tool's factor composes with license
  factors — feeding P1 speed and P2 breadth with no new mechanics. `buytool <id>`
  and `selltool <instance-id>` are shared by Terminal and the Market PLAYER TOOLS
  panel (owned copies show author, paid price and resale value with SELL;
  listings show `by <author> · X cr one-time` with BUY). Tools are always a lift,
  never a gate.
- **Digital-value graph (P6).** The *transaction graphs, not anonymous money
  bars* above are now inspectable: the Market app folds the player's full
  lifetime ledger by counterparty into a ranked value network — each node shows
  what they gave (`received`) and got (`paid`) versus the player, their net
  standing, interaction count, first/last world time, and which causes touched
  them; scene handles (contract issuers, tool authors) are `peer` nodes, and
  `market`/`landlord`/`vendor`/`fence` are `institution` roles. The graph is
  **purely derived** — no new state, events, commands, or save surface — and
  honestly player-centred: it shows only edges the ledger actually recorded, so
  multi-hop NPC↔NPC value chains wait for the slice that simulates credit
  flowing between actors, rather than inventing edges.
- **Persistence.** `economy` is optional in the save schema and loads as an empty
  wallet on legacy snapshots, so older saves resume cleanly. Durations, scope,
  license and tool effects derive at action time, so there is nothing to migrate;
  a legacy economy loads with `housing: null` (the free baseline), an empty
  `software` list (no running tools), and an empty `playerTools` inventory.
