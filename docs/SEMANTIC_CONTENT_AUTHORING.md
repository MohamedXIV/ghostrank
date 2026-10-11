# Semantic Content Authoring — design examples and review checklist

**Status:** illustrative data language, **not supported by shipped code**. Epic #135; implementation slices #136–#143. Read GAME_DNA.md and SEMANTIC_SANDBOX_ARCHITECTURE.md first.

## Write situations, not fixed victory scripts

An author specifies scope bindings, observable sources, conditions, meaningful alternatives, authorized effect IDs, and cooldowns. The simulation decides whether an intent is legal/succeeds and who can respond. New mechanical verbs legitimately require code and tests; content-only reuse applies to **combinations of existing mechanics**, not magical zero-code game systems.

### Example 1 — variation of an existing evidence contract

~~~yaml
id: contract.infrastructure-map.v2
kind: contract-template
bind:
  issuer: actor.contact
  target: target.not-owned-by-issuer
eligibility:
  all:
    - relation: issuer.can-offer-to-player
    - fact: target.has-reachable-machines
objective:
  predicate: evidence.observed-machine-count
  at_least: 2
  after: contract.accepted_at
deadline: standard-map-window
reward: contract-payout-policy
~~~

This is only an **authoring sketch**. The implementation must prove the observed machines really belong to the chosen target, are not retired, and were earned after required boundaries; rewards and trust remain authored policies executed by existing domain handlers. A second configuration must work without adding another objective switch case.

### Example 2 — a real discovery without an issuer

~~~yaml
id: opportunity.disputed-archive
kind: world-opportunity
on: incident.publicly-reported
bind:
  source: event.source
  institution: event.affected-owner
availability:
  all:
    - fact: source.report-exists
    - fact: player.has-accessible-lead
choices:
  - verify-source
  - confidential-handoff
  - public-disclosure
  - offer-for-sale
  - walk-away
repeat:
  cooldown: event-family-scoped
  max_active_by_institution: 1
~~~

The report can be wrong and should remain labeled reported until corroborated. The opportunity may be ignored; the underlying institution/rival project continues. The player's options are real only if simulation supports their prerequisites, time/risk and downstream reactions. Nothing can be marked verified just by browsing Ink text.

### Example 3 — NPC-driven counter-story

~~~yaml
id: project.rival-suppresses-leak
kind: npc-project
on: institution.leak-became-credible
bind:
  actor: interested-rival
  subject: event.institution
conditions:
  all:
    - fact: actor.has-relevant-motive
    - relation: actor.has-reachable-contact
response_candidates:
  - buy-rumor
  - challenge-source
  - shield-organization
  - do-nothing
evaluation: on-relevant-event-or-pulse
~~~

No omniscience: the rival can react only if its news/contacts legitimately learned about the leak. What it selects depends on existing agenda, resources, contacts and weighted policy, not a hardcoded villain script. If a future fictional national entity is required, add a bounded domain model first rather than merely labeling an old crew a country.

## Ink scene contracts

A narrative file can present the same rumor differently to a careful broker, hostile rival, or unsuspecting player. Pass only approved player-safe variables (public handle, known facts, observed/reported source descriptors, current action preview). Choice tags map to finite intents such as claim/request-corroboration, negotiate, withdraw or disclose, which are validated by CommandBus. Never give Ink raw world arrays, secret flags or mutable JS callbacks.

Example interface, not existing API:

~~~ts
type NarrativeChoiceIntent = {
  storyId: string;
  choiceId: string;
  boundEntityIds: string[];
  expectedNarrativeVersion: string;
};
// CommandBus checks observed facts, permissions, time, costs and current rules.
~~~

A loaded story must have a deterministic current-run version and cursor. Rejected/stale choice has a safe fallback; a story author cannot assign NPC grudge, reveal a secret or credit money by writing a choice label.

## Authoring and code structure

- Prefer one meaningful domain content module with a few related variants over one giant world file or one file per ten lines.
- Every definition has a stable namespaced ID, version, owner, source and real producer; validate cross-references, impossible prerequisites, unintended duplicate IDs, chronology and disclosure levels.
- Keep parameter ranges, aliases and tuning **in data** when logic already exists. Introduce a new typed effect handler/domain only for new simulation capability and test it separately.
- Separate author-facing editorial tags and presentation copy from gameplay power. Archetype, tier and rank must not gate outcome.
- On a generated world, bind to actual target/actor/organization IDs; don't depend on a Nightshade-only string or a hidden fixture.
- Repetition needs a meaningful changed cause/source/actor/action, an expiry or cooldown, and a way to disengage. An event should never pay itself by looping its own on-action indefinitely.
- Provide a developer trace: eligible/not eligible reason, observer/knowledge lens, event cause and exact world minute; never project that trace to the player.

## Definition of playable content

Answer in the implementation PR: Which **specific player decision** exists? What was **earned vs reported**? Can the world produce the same kind of situation **without a broker** and **without player action**? What can the player safely refuse or fail? Which **third party** learns what and why? Which action has a measurable opportunity cost? Does another seed lead to a changed plan rather than changed labels? Are UI and terminal truthful to the same CommandBus?

Minimum verification: focused RED/GREEN tests, fixed seeds, invalid/forged scopes and contradictory reports, current save/replay, split vs bulk world time, post-ending no-op, rank invariance, Node24 gates and Chromium for changed interaction. Real unfamiliar-human tests are separate and currently **NOT RUN**.
