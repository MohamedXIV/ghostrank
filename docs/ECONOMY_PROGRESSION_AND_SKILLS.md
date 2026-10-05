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

## Implementation status (Phase 4 P0–P7 + Phase 5 P0–P4 + Phase 6 P0–P2)

The Phase 4 economy is live through P7, all of Phase 5 is live: the model
substrate (P0), compute contention (P1), AI analysis (P2), the software forge
(P3), and the marketplace-plus-NPC-AI slice (P4). Phase 6 has begun: P0 gave
physical life its first shipped mechanics — relocation and safehouses — P1
gave the run its first threat that runs on the world's clock, authority
investigations, and P2 turned the ecosystem's automation on the player with
rival probes. This section describes what the simulation actually does today;
the sections above remain the design target for later slices.

- **Wallet and ledger.** The player holds a single `credits` balance and an
  append-only value ledger. Every movement records its direction, amount,
  resulting balance, cause (`contract`, `hardware`, `housing`, `upkeep`,
  `license`, `tool`, `machine`, or `model`), and counterparty. Credits can never
  go negative: a transfer that would take the balance below zero is rejected and
  mutates nothing. There is no debt.
- **Income.** Contract delivery is the first income source and pays a
  deterministic amount — `80 + 40 × requiredServices` for a recon report, `260`
  for an intrusion. Payout is never random and never rank-dependent.
- **Hardware.** A data-driven catalog (`src/content/hardware-catalog.ts`) spans
  five capability axes: compute, memory, vram, storage, network. Every run starts
  with a free secondhand workstation; upgrades are bought with credits through the
  `buyHardware` command, shared by Terminal (`buy <catalog-id>`) and the Market
  app, and costing no world time.
- **Capability, not level.** Rig capability is *derived* — the sum of owned
  hardware, owned machines, the current lease, capability-bearing licenses, and
  owned player tools (see P3/P4/P5/P7) — it is never stored and never gates a
  target or a purchase.
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
- **Multiple named machines (P7).** Beyond components sit *complete boxes*
  (`src/content/machine-catalog.ts`) — whole named systems the player can own
  several of, following the P5 economic shape exactly: a one-time `market`
  debit (ledger cause `machine`), **no recurring fee**, and resale through the
  same `fence` for `floor(paid × 0.5)` of the stored paid price, so retuning
  never re-values a box already in the rack. Each box stores its player-chosen
  `label`, and renaming (`box name <box-id> <label…>`, trimmed and capped at
  24 chars) is **identity, not power** — capability derives only from the
  catalog id and folds into the same `effectiveCapability`, so the rack feeds
  P1 speed and P2 breadth with no new mechanics. An empty rack is the untouched
  baseline. `box buy` / `box sell` / `box name` are shared by Terminal and the
  Market MACHINES panel (owned boxes show paid/sell price with an inline rename
  and SELL; listings show `X cr one-time · owned ×N` with BUY). Machines are
  always a lift, never a gate.
- **AI models — the assistant slot (Phase 5 P0).** Models
  (`src/content/model-catalog.ts`) are not capability but a *shortcut*: exactly
  one running model multiplies derived action minutes through the same
  `combineFactors` path licenses and tools compose with (one floor, the P1
  one-minute floor still leading), and no model running is exact identity. The
  two sources are opposite economic shapes, each an established template:
  **cloud is rent** — running *is* renting, moving no credits to start, switch,
  or stop, while `advanceUpkeep` bills the `provider` (ledger cause `model`) at
  each crossed world-day boundary, and an unpayable boundary simply lapses the
  model (no debt, the license semantics); **local is property** — a one-time
  `market` debit, then it runs free forever, and buying never auto-runs, because
  owning and using are separate choices. `model buy <id>` / `model run <id>` /
  `model stop` are shared by Terminal and the Market AI MODELS panel (each
  listing shows its factor and rent-or-property price; the wallet's combined
  daily upkeep folds in a running cloud subscription). Model properties
  (reasoning/context/reliability) ship as seeded data nothing consumes yet —
  reserved for the analysis and build slices — never a gate.
- **Compute contention (Phase 5 P1).** The `vram` and `storage` axes — summed
  by every catalog since the substrate but read by nothing until now — became
  live consumers, discharging the #22 *constraints* handoff and turning
  hardware into a decision rather than a passive bonus. A running **local**
  model occupies a footprint on the player's own rig, and how well the rig's
  pool covers it decides how much of the model's advertised shortcut actually
  arrives: the scarcer of the two axes bottlenecks (a `min` of coverage). A
  fully-provisioned rig gets the full factor, a starved one drifts to ×1 —
  exactly the speed of running no model — so contention **taxes only the
  model's own shortcut, never the player below the baseline** (the standing
  lift-never-punishment rule) and a starved model stays runnable, helps less,
  and never blocks or bills. **Cloud models carry a zero footprint**: the
  provider hosts them, so renting never contends with the rig — the
  counterweight to their daily fee (rent costs credits and is rig-free;
  property runs free and is rig-hungry). This is pure derived physics — no
  reservation, no new state or commands (feed the pool with the existing GPU
  and storage buys, stop the model, or rent from the cloud) — and the Market
  listings show each model's footprint and the factor *this rig* would deliver,
  making the feed-it-or-rent-it choice legible before it costs anything.
- **AI analysis (Phase 5 P2).** The model properties P0 seeded finally get
  their consumer: `analyze <target-id>` asks the running assistant for a
  **fallible read of the target's unseen topology** — machine roles the recon
  has not surveyed, and service kinds only on hosts it has, reasoning from the
  visible topology outward. It costs no world time and leaves no trace (the
  contract-verb precedent): verification is expert play and must stay cheap,
  while the model's real cost is already paid through its rent (P0) or rig
  footprint (P1). The economics stay untouched — analysis moves no credits, and
  what it spends is the assistant's *quality*: `context` budgets how much
  topology a pass reads, `reliability` sets the odds each claim matches hidden
  ground truth (capped at 0.8 — no model is trustworthy enough to skip
  verifying), and `reasoning` + `context` set the confidence the claim is
  *stated* with, independent of whether it is right, so a cheaper-but-eloquent
  model can sound better than it is. The assistant needs a model running —
  its function, not a gate: survey and inspect never require one, and no
  target or item is locked behind analysis. Its conclusions are predictions the
  projection deliberately cannot grade: a claim's hidden subject id and its
  hidden accuracy stay in the simulation (they persist, they never surface), so
  the read never hands over structure the player has not earned, and the loop
  closes by comparing the panel against your own recon. The Recon app's
  ASSISTANT ANALYSIS panel states it plainly: predictions, not evidence.
- **Software forge (Phase 5 P3).** The build system turns the assistant into a
  programmer: `build <spec-id>` hands it a workflow spec — a safe
  workflow/IR from `src/content/workflow-spec-catalog.ts`, an ordered list of
  fictional pipeline steps, pure data that never executes — and the rig writes
  the program over world time. The price shape is the money-vs-time-vs-skill
  triangle made playable: building moves **no credits**; you pay in minutes
  (base `complexityMinutes`, shortened by the compute axis and the running
  model's *delivered* shortcut, frozen at commissioning so a split wait cannot
  re-time it) and in rig occupancy (each in-flight build holds VRAM and storage
  — the second tenant P1's contention pool was waiting for, so a queue taxes
  both later estimates and the model's own delivered factor, never below the
  no-lift baseline). The finished workflow contributes a plain `SoftwareEffect`
  through the same capability/factor combinators licenses and tools use — the
  core rule that software creation reuses the purchased-tools capability system,
  enforced by there being no second system. Quality inherits P2's doctrine: one
  seeded roll at start splits into clean / warnings / defective, with
  `reasoning` setting clean odds (capped at 0.7 — lower than analysis, because
  writing whole programs is harder than labelling a host) and `reliability`
  deciding whether failures bite; a defective copy delivers halved effect
  (floor 1 on nonzero axes, shortcut halfway back to ×1) — disappointing, never
  a trap. The three specs mirror the three premium licenses one-for-one, so
  #23's exit criterion is checkable: build the Homegrown Monitoring Loop, stop
  renting the Commercial Monitoring Suite, lose nothing. The queue is
  completed by the same clock tick as upkeep (`advanceBuilds`), and the leak
  rule inverts where it should: an in-flight build's frozen outcome is hidden
  until completion (a halfway report card grades the roll for free), but an
  owned workflow projects *in full* — outcome, tests, provenance — because it
  is the player's own ground truth, not someone else's hidden topology. The
  Market FORGE panel shows specs with this rig's estimate, the queue with due
  times, and the garage with report cards; a self-built copy permanently
  replaces a recurring fee with owned software.
- **Marketplace provenance and NPC AI use (Phase 5 P4).** The model catalog
  finally has an *author* side. `ModelListing.author` is catalog data: when
  present, the one-time `model buy` debit goes to that named peer instead of
  the anonymous market, so the value graph gains a `peer` node with a paid
  total — the P5 tool-author template reused verbatim, with `market` still the
  house brand for every unauthored copy. The Salvaged Reason Core (600, ×0.85,
  reasoning 4 / reliability 2, footprint 3/1, author `moebius`) is the cheap
  stronger planner: it out-plans the reliable workhorse and slips roughly twice
  as often, the same reasoning-versus-reliability trade the player's own model
  choice already prices. And AI is no longer player-exclusive: a peer can run a
  model (`UndergroundActor.modelId`, hidden truth, never projected raw), and one
  pure function turns it into that tick's assist — a competent read lifts the
  actor's offence (band − 2, never a subtraction on a good read), while a miss
  (`(6 − reliability)/12`, nonzero even at band 5 because fallible-never-
  deterministic binds the whole ecosystem) costs skill *and* 18 discretion, so
  an AI-assisted mistake is how a peer's incident surfaces in the public feed.
  The same function read from the defender's seat is "automation to watch": a
  watching assistant raises a box's defence on a good read and lowers it when
  the model misses the pattern. No new command, event, or ledger cause kind —
  `model buy/run/stop` already covered the flow — and no model is exact
  `{ 0, 0 }`, so every world of unassisted peers keeps its old math to the
  byte. The projection shows *that* a peer runs an assistant (handle + model
  label + author only, never the lift), keeping D028's leak boundary intact at
  ecosystem scale.
- **Physical life: relocation and safehouses (Phase 6 P0).** The *Physical life*
  list above finally has shipped mechanics behind two of its lines. Where the
  player physically **is** is derived from the lease they hold — there is no
  second location field, so eviction, lapse, and relocation can never disagree,
  and the slice adds no state, events, or save-schema surface. The design's
  *relocation* lands as a cost paid in the triangle's other currency: catalog
  dwellings may declare `travelMinutes`, and a move costs the **difference**
  between districts (so it is symmetric — fleeing to the outskirts and coming
  back each pay the journey), charged by advancing the world clock *before* the
  lease changes. The player therefore pays rent wherever they actually slept
  during the trip, the ecosystem keeps rolling while they travel, and nothing
  moves credits: money was never the constraint on leaving town, exposure is.
  *Short-term safe locations* land as two `kind: "safehouse"` dwellings that
  contribute **zero capability on every axis** — concealment is bought with
  distance and daily upkeep, never with power, so a safehouse cannot become a
  purchase that gates anything and staying in one costs the rig lift a lab bench
  would have given. Each listing carries an `anonymity` band
  (`public`/`quiet`/`hidden`, names never numbers), and that band is now read by
  two systems: Phase 6 P2's rival probes treat a `quiet` or `hidden` dwelling as
  strictly harder to read (`public > quiet > hidden` is a tested inequality),
  which is what makes a safehouse a counterplay choice rather than decoration
  before anything physical arrives, and Phase 6 P3's physical retaliation reads
  it as a targeting input. The room now renders the projected presence instead of a hardcoded
  caption, and its MOVE / PACK UP controls issue physical intents that map onto
  the same `rent` / `lease break` commands the Terminal and Market emit.
  Holding no lease remains the free baseline, and involuntary eviction stays
  instant — the world acting on the player is not the player choosing to travel.
- **Authority investigations: a case file, not a meter (Phase 6 P1).** The
  *Information and relationships* list's first threat now has machinery, and it
  is deliberately the least numerical system in the game. A file opens when the
  footprint the player already emitted against a target reaches the same five
  that raise the target's own defensive watch, and its material is arithmetic
  over that footprint plus one unit of follow-up per 360-minute review boundary
  that found something new — **no roll, no seed, no difficulty score, no rank**.
  Two identical histories at rank 1 and rank 999,999 produce identical files,
  because reputation decides who talks about you and never what an authority's
  paperwork contains (P2's rival probes turned out to be driven by grudge, and
  rank appears nowhere in their math either — see D033).
  Inactivity is a real response: a review with nothing new adds nothing, so
  laying low *cools* a file rather than resetting it, and nothing already
  noticed is ever un-noticed. What the player receives is the design's own
  evidence list — an unusual login, changed marketplace behavior, a message with
  no sender — at most one item per boundary, described in the Underground app's
  ATTENTION panel beside the social HEAT list. Pressure past the third band
  (`probing` / `warming` / `converging`) keeps accruing as hidden truth:
  Phase 6 P3 physical retaliation now reads it as a targeting input alongside
  P0's anonymity band, and P4's compromise reads both next.
  Relocation and safehouses are how a player answers it today — time and
  distance, both already priced in world minutes — because a converging file
  blocks nothing: no action, no target, no purchase. Threat is evidence, never
  a percentage, and never a countdown: the projection carries only minutes that
  already happened.
- **Rival probes: the ecosystem's automation aimed at you (Phase 6 P2).** #23's
  deferred "use automation to watch **the player**" is now mechanically true, and
  with no second rulebook: a probing peer reads the *same* `npcAssistDeltas`
  primitive, with the same seed/tick/actor salt, that decides a peer's offence and
  a target's defence, so a good model sharpens the read and an AI-assisted mistake
  degrades it twice over — a rival trusts a confident misread. Interest is
  **grudge, never rank** (a floor of 5 toward the player, deliberately below the
  smear ladder's 30), so a world in which nobody holds anything against you has no
  candidates, no probe rolls at all, and replays byte-identical to the code before
  this slice — pinned by six golden digests, with a companion test showing the
  provoked runs really do produce probes. A read's difficulty is assembled
  entirely from truths the player controls: the footprint band, the dwelling's
  `anonymity` band, whether their exits have been quiet or escalatory (the sim's
  only vocabulary for "changes relays"), and whether an intrusive operation is
  open — bounded to `[8, 78]` percent so no player is ever unreadable and none is
  ever read with certainty. The knowledge a rival gains is a **durable record**,
  not a hidden scalar, and it persists half-invisible: `actorId`, `subject`, and
  `correct` are stored for P3's targeting (a rival can be genuinely fooled, and
  stay fooled across a restore) while the screen receives only the **derived tell**
  — a ping, a call, a contact gone quiet — beside P1's authority evidence in the
  same ATTENTION panel. No verb was added, so parity stays structural, and no
  probe gates anything: every action still answers in a world that has read you.
- **Physical retaliation and interruption (Phase 6 P3).** A peer can cross the
  network/room boundary only from existing causal facts: enough grudge, the
  existing Black-network backing seat, and a **prior** P2 probe. Rank never enters
  the roll. P0 anonymity lowers physical exposure and P1 investigation progress
  raises it, so the same choices already priced in time/economy now alter threat
  rather than creating a separate heat currency. Probe correctness stays causal:
  a correct rig read may produce an outage while a wrong one becomes unusual
  connectivity; a correct dwelling read may destroy one hardware instance while a
  wrong one leaves only door-camera motion. The capability floor survives loss —
  zero owned hardware still permits baseline actions — and P3 does not destroy the
  lease; D021's scripted lease loss is now explicitly P4 catastrophic-compromise
  scope. #23's build-interruption handoff is a **pause outside the frozen build
  clock**: commissioning `startedWorldMinute`, `dueWorldMinute`, model/spec and
  quality outcome never change; optional active/accumulated pause state shifts only
  the derived completion boundary. A job started during an outage joins the pause,
  an outage on the exact due tick wins the tie, and save/restore preserves the
  interruption. Upkeep, investigation and build deadlines are therefore folded
  around the ecosystem's existing tick loop so one long wait and equivalent split
  waits see the same as-of-tick state without a second scheduler. The durable
  `PhysicalThreat` keeps actor/probe/citation/impact truth for P5, while ATTENTION
  and the room receive only the ambiguous signal and past minute — never a cause,
  correctness flag, destroyed id or outage countdown. No `RunEnded`: Phase 7
  still owns endings.
- **Catastrophic compromise as condition (Phase 6 P4).** P4 turns only severe
  P3 consequences into append-only causal history; it adds no roll, rank input
  or danger meter. `rig-lost` requires the final destructive hit to leave no
  component and no complete owned machine; `dwelling-lost` is D021's scripted
  lease loss at the location actually hit; `identity-exposed` requires a
  correct current dwelling read plus cited converging authority material; and
  `stranded` requires the explicit resource floor — zero credits, no lease,
  components or complete machine, and no authored player tool left to sell.
  Existing economy fields stay authoritative, so a compromise record cannot
  desync ownership. Exact-boundary chronology is economic too: upkeep charges
  the lease first, then P3/P4 may burn it, and later boundaries cannot charge it
  again. A 64-seed real-chain harness leaves 41/64 reckless and 48/64 measured
  runs without a catastrophic condition at day 10, while still producing early
  failures (14/64 reckless by day 5); those are tuning observations, not locked
  odds. Projection exposes only the condition label/kind/minute, and the command
  bus remains usable — Phase 7 owns terminal endings.
- **Postmortem as a derived read (Phase 6 P5).** P5 adds no economy state and no
  new recorder. It reads the provenance P1–P4 already persisted and projects a
  chronological, player-safe explanation beside each compromise. The chain can
  cite the player's own actions and already-visible evidence, but it never leaks
  hidden actor identity, probe correctness, investigation progress, physical
  location, or seed. If a player-caused trace cannot be reached through the
  stored provenance, the result is INCOMPLETE ATTRIBUTION rather than invented
  blame. Because this is derivation, it cannot desync from credits, inventory,
  housing, or the compromise record and it requires no migration.
- **Persistence.** `economy` is optional in the save schema and loads as an empty
  wallet on legacy snapshots, so older saves resume cleanly. Durations, scope,
  license and tool effects derive at action time, so there is nothing to migrate;
  a legacy economy loads with `housing: null` (the free baseline), an empty
  `software` list (no running tools), an empty `playerTools` inventory, an
  empty `ownedMachines` rack, no `ownedModels`, no `ownedWorkflows`, and
  `activeModel: null` — the untouched baseline in every layer. Stored `analysis`
  records and the in-flight `builds` queue likewise default to empty, and a
  legacy actor without `modelId` loads as an unassisted peer — the pre-P4
  ecosystem verbatim. Phase 6 P0 adds **nothing to persist**: presence is a read
  of `economy.housing`, so a legacy save resumes at the baseline room and a
  stale lease id resolves there rather than fabricating a place. Phase 6 P1 adds
  one optional array — `investigations` loads as `[]`, and its signals and their
  ids likewise, so a pre-Phase-6 save resumes with no file open and the first
  one it opens is derived from the footprint the save already carries, on the
  boundary that material implies rather than on the minute the load happened.
  Phase 6 P2 adds a second optional array — `probes` loads as `[]`, so a
  pre-Phase-6 save resumes with no rival having read you and the first probe is
  rolled on a tick that actually runs — and it sits at `WorldState` top level
  rather than inside `underground` specifically so the ecosystem object's exact
  legacy shape stays untouched. Phase 6 P3 adds `physicalThreats`, legacy-defaulted
  to `[]`, and only optional pause fields on in-flight builds, so untouched jobs
  retain their pre-P3 shape. Hidden outage ends, source probes/citations and impact
  ids survive a save; projection strips them. Phase 6 P4 adds one more
  legacy-defaulted top-level array, `compromises: []`; each record persists
  source threat/probe/investigation ids and the struck location for P5/Phase 7,
  while the live projection strips all four and keeps only the named condition
  and minute. Historical P3 threats do not synthesize P4 records on load. Phase
  6 P5 adds **nothing to persist**: postmortems are rebuilt from those existing
  records after every load, the same derive-not-store discipline as the value
  graph and reputation descriptors. A claim's
  subject id and accuracy, and an in-flight build's frozen outcome, are saved
  but never projected; a *completed* workflow's outcome and report are saved and
  do project, because they are the player's own ground truth.
