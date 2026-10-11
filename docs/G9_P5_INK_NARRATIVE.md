# G9 P5 — Ink narrative adapter, never simulation authority

**Issue:** #141 · **PR:** #150

G9 P5 adds **inkjs 2.4.0**, pinned by npm dependencies and lockfile. Two *trusted, versioned*, authored Ink stories are maintained in `src/content/narrative/stories.ts`: a public-index NPC relay dialogue and the real G9 P4 independent-lead dilemma. The engine in `src/game/narrative/ink-runtime.ts` runs the actual Ink compiler and Story runtime. There is no eval, no external Ink world-write binding, no arbitrary story upload and no bridge to the raw world.

The adapter in `src/game/narrative/adapter.ts` admits only registered `storyId` values and actual player-visible sources: a public NPC or an earned/visible independent lead. Ink is hydrated only from **safe variant** (`npc`, `unmapped`, `mapped`) and the public handle/source category. It receives **no** source actor skills, motives, incident truth, rumor accuracy, wallet or raw simulation object. A private relayed rumor can be discussed as a claim, but not verified by narrative narration.

Ink choices become a **closed, typed mapping** of authored choice indexes to `investigateLead` or `resolveLead` commands. The `CommandBus` validates each choice ID against the *currently offered* engine choices, rechecks source authorization, dispatches the intent through its **existing CommandBus command path**, and records the choice only after the command succeeds. Failed command ⇒ no choice consumed, no reward, no new world time. A generic NPC conversation costs no world minutes and never changes rank/trust/credits.

A run persists a small `NarrativeSession` with a version-1 authored story ID, public reference, selected branch variant and optional index; **not** a raw/untrusted Ink VM memory blob. It replays deterministically with the pinned story definition. A new story revision must receive a new ID/version, not silently rewrite v1. Save schema accepts only the finite, tagged run shape.

The player-safe `WorldProjection.narrative` and TinyBase `narrative` / `narrativeChoices` rows power an Underground panel with native keyboard-operable, labelled buttons and live status feedback. `TALK` on a public NPC and `STORY // DECIDE` on a qualifying Lead both use the same actions as terminal `talk <actor-id>`, `story lead <lead-id>`, read-only `story view`, and `story choose <scene-id> <choice-id>`. Successful terminal story commands also print the same player-safe story and offered choice IDs directly, so no GUI is required to see the options. The existing `lead ...` terminal commands remain direct alternate verbs.

Checks: focused Ink compilation, malformed source/choice, misleading private rumor, failed intent atomicity, save/reload, rank/credit non-interference, GUI-terminal equivalence; Node 24 `npm ci/test/typecheck/lint/build` and Chromium 390px integration. **Novice human playtest NOT RUN.** No G3 P2 Log Forensics implementation; PR #116 remains a draft.
