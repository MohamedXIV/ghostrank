# Phase 8 P3 — Contract breadth

Parent: #26  
Depends on: P0 world-content roster (D044 / #48), P1 telemetry (D045 / #49),
P2 target/NPC breadth (D046 / #50).

## Goal

Broaden the opportunity mix without turning contracts into scripted missions or
adding real-world exploit verbs.

A contract remains a promise against facts the ordinary simulation already
records. Accept/decline/deliver are the only contract commands. The player
fulfils work through the same recon/operation commands used in free play, and
delivery verifies authoritative evidence/traces rather than a mission flag.

## Objective vocabulary

### recon-report

Existing objective. Deliver observed service evidence for the target.

- requirement: `requiredServices` (1–2, clamped to authored topology);
- due: 2 world days;
- payout: 80 + 40 per required service.

### infrastructure-map

Broader reconnaissance without inspecting service detail.

- requirement: `requiredMachines` (1–2, clamped to authored topology);
- completion: enough `machine-presence` evidence for the target;
- due: 3 world days;
- payout: 90 + 45 per required machine.

### quiet-recon

A contract that values restraint rather than intrusion.

- completion requires at least one known target machine;
- a post-acceptance `operation-disengagement` trace on that target must have
  stage `recon`;
- an intrusive exit does not satisfy it;
- prior recon before acceptance cannot satisfy the chronology on its own;
- due: 2 world days;
- payout: 180 credits.

### intrusion

Existing objective.

- completion: a post-acceptance `operation-escalation` trace on the target;
- due: 4 world days;
- payout: 260 credits.

## Offer generation

Trusted-contact, own-target exclusion, open-contract limits, long-run-pressure
bonuses, expiry, and stateless deterministic hashing remain unchanged.

The existing objective hash now selects one of four objective kinds. Only the
objective-specific visible requirement is authored on the contract:
`requiredServices` for recon reports or `requiredMachines` for infrastructure
maps. Quiet recon and intrusion need no extra scalar.

## Rewards and consequences

P3 deliberately reuses the existing contract resolution path:

- payout enters the ordinary value ledger with cause `contract`;
- issuer trust changes through the existing relationship event;
- successful delivery uses the existing 1% reputation/rank movement;
- missed accepted work keeps the existing trust penalty;
- completed work can still be discussed by the existing forum path.

No objective has a unique reward subsystem.

## Information boundary

Contract requirements are player-visible facts. Projection/TinyBase may expose:

- objective kind;
- required service or machine count where applicable;
- issuer/target handles;
- status and deadlines.

They do not expose the target's hidden topology merely because a contract asks
for coverage. The player still has to earn machine/service evidence through
ordinary recon.

## Telemetry policy

The P1 harness remains a scripted player, not a state editor.

- recon-report uses normal survey/inspect commands;
- infrastructure-map surveys until the required machine evidence exists;
- quiet-recon obtains machine evidence and performs a recon-stage disengagement;
- intrusion uses the existing escalation path.

The post-P3 32-seed report is recorded as comparison evidence; P3 does not
retune Phase 6/7 danger to preserve P2 outcome percentages.

## Persistence

`requiredMachines` is optional and the objective enum is extended
compatibly. Old contracts/saves keep their existing recon-report/intrusion
values, so no migration/defaulted authoritative subsystem is required.

## Verification

P3 tests pin:

- all four objective kinds can be generated deterministically;
- target ownership/trusted-contact/open-limit rules stay unchanged;
- requirements are derived from existing evidence/traces;
- infrastructure-map cannot read hidden topology;
- quiet-recon distinguishes recon exit from intrusive exit and respects
  acceptance chronology;
- deadlines and payouts are deterministic and rank-independent;
- Terminal/GUI still share accept/decline/deliver commands;
- save round-trip preserves all objective shapes;
- projection/TinyBase expose requirement counts but no hidden infrastructure;
- telemetry can actually complete every objective via typed commands.
