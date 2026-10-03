# Phase 3 P2 — Contracts

Issue: #21
Builds on: P0 substrate, P1 rumors and messages (merged in #28)

## Goal

Let the ecosystem offer work. Trusted contacts offer the player contracts against targets in the world. A contract is an opportunity that lives inside the same operation model as freeform targets: it is verified from the evidence and traces the player already produces, never from a separate mission script.

Everything is a fictional abstract model. There are no payments yet (money arrives in Phase 4); rewards are social: trust and reputation.

## Rules

### Offers

- Offered on ecosystem ticks (same 360-minute boundaries, same stateless hash).
- An issuer is an actor whose relationship toward the player has `trust >= 10`. Rank is never an input.
- An issuer never offers a contract against a target it owns.
- Each eligible issuer offers with 10% probability per tick, at most one open contract per issuer, and at most 3 open (offered or accepted) contracts in the world.
- The target and objective are chosen by hash. Targets are real `TargetState`s.
- An offer stays open for 24 world hours (`expiresWorldMinute`).

### Objectives (verified from existing state)

- `recon-report`: the player holds service evidence for at least `requiredServices` services (1 or 2, clamped to what the target has) on the contract's target.
- `intrusion`: an `operation-escalation` trace exists for the target recorded at or after the minute the contract was accepted.

### Lifecycle

`offered -> accepted -> completed`, with `declined` and `expired` as the other ends.

- `acceptContract`: only while offered and not past `expiresWorldMinute`. Sets `dueWorldMinute` (2 days for `recon-report`, 4 days for `intrusion`).
- `declineContract`: no penalty.
- `deliverContract`: only while accepted and not past `dueWorldMinute`, and only if the objective is met.
- An offer that is never accepted expires on a tick with no penalty.
- An accepted contract past its due time expires on a tick and the issuer loses trust in the player (`trust -15`, cause `contract`).
- All three commands cost no world time.

### Rewards

- Delivering raises the issuer's trust toward the player (`+15`, cause `contract`) and improves the player's rank by 1% (minimum 1), the same movement rule the ecosystem uses.
- A contract is never required, and no rank ever gates accepting one.

## State

`UndergroundState.contracts[]`: `id, issuerId, targetId, objective, requiredServices?, status, offeredWorldMinute, expiresWorldMinute, acceptedWorldMinute?, dueWorldMinute?, resolvedWorldMinute?`.

## Commands and events

- Commands: `acceptContract`, `declineContract`, `deliverContract` (Terminal: `contract accept|decline|deliver <id>`).
- Errors: `CONTRACT_NOT_FOUND`, `CONTRACT_NOT_OFFERED`, `CONTRACT_NOT_ACCEPTED`, `CONTRACT_EXPIRED`, `OBJECTIVE_NOT_MET`.
- Events: `ContractOffered`, `ContractAccepted`, `ContractDeclined`, `ContractDelivered`, `ContractExpired`, `PlayerRankChanged`; `RelationshipChanged` gains `causeKind: "contract"`.

## Projection

Contracts the player can act on or has resolved (newest first, cap 20): issuer handle, target id and handle, objective, required services, status, and the relevant deadlines. No hidden truth is involved.

## Invariants (tested)

- same seed + commands => identical contracts; batching waits never changes them; rank never changes them,
- only trusted contacts offer, never against their own target, at most 3 open at once,
- accepting is never gated by rank,
- objectives are verified from evidence/traces, and an escalation before accepting does not count,
- expiry penalizes only accepted-and-missed contracts,
- delivering updates trust and player rank with provenance,
- Terminal and GUI produce the same commands,
- legacy saves load with no contracts,
- restore-and-continue equals uninterrupted play.

## Out of scope

Payments, issuer betrayal and other contracts going wrong, black-side issuers (no black contact trusts the player yet), retaliation, the unmasking taboo, reputation descriptors.
