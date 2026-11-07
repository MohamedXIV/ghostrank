# G3 P2 candidate — Reusable Log Forensics / Evidence Correlation

**Date:** 2026-10-10
**Status: PROPOSAL FOR MECHANIC CHOICE AND WRITTEN-DESIGN REVIEW ONLY. NOT APPROVED. NO IMPLEMENTATION.**
**Tracks:** #110; G3 #79; Game-First #75; follows shipped G3 P1 #105, #108, #112, #113.
**Live baseline used:** main `339487b0c7fe5b97ff6019180a92e57c684b990c`.
**Human G3 novice 20–30-minute playtest:** **NOT RUN**. No positive player feedback can be assumed.

## 1. Mechanic selection: alternatives, stakes, decision

| Candidate | What the player learns | Strength | Risk / unproven dependency |
| --- | --- | --- | --- |
| **Log Forensics / causal correlation (recommended for review)** | Compare provenance, ordering and imperfect reports; choose whether evidence warrants an accusation | Different skill from G3 P1 route attribute matching; directly relevant to NPC threats and own defense | No present generic event-log case domain and no player-rig service log store; must prove two real providers, not simulate availability |
| Packet/Traffic Pattern | Detect repeated fictional transmission patterns and temporal relationships | Small interface, easy seeded content | Likely another `match two properties -> click answer` operation without a distinct decision; no independent packet source today |
| Untrusted Drop / Sandbox Triage | Spend limited compute/time on suspicious fictional files with contamination risk | Strong cautious-operator fantasy, real hardware/tool consequences | New contamination, artifact and sandbox policy; high scope before novice feedback |
| Access/Trust | Investigate role delegations and misleading endorsements | Social-hacking fantasy fits factions | More generated roles/permission graph and NPC coordination design required |

**Recommendation, not authorization:** Write a narrow Log Forensics prototype *spec first*, then let the user approve or reject **mechanic choice**, the **written design**, and finally a separate **TDD plan**. If the first real G3 P1 human test shows a more urgent route puzzle defect, re-prioritize; never label simulated/browser interaction as the missing human observation.

Do not build five game variants at once. Log Forensics must be a distinct reasoning activity, not a new skin for Network Mapping.

## 2. Player-facing question and one six-record example

**Question:** A broker alleges a service was touched before its transfer authorization; an opposing operator denies involvement. What record is unreliable, which *two independently obtained records* establish the inconsistency, and is an immediate public assertion worth the risk?

Proposed **fictional** case, not actual game data:

| ID | Source | Displayed timestamp | Claim | Provenance cue |
| --- | --- | --- | --- | --- |
| A | Relay event ticket | 10:08 | `parcel-7` was emitted by Relay East | Locally observed signed ticket |
| B | Vault receipt | 10:04 | `parcel-7` reached Vault South | Independently inspected service receipt |
| C | Broker forward | 10:01 | "The vault accepted it before the relay fired" | Forwarded, not witnessed; disputed |
| D | Relay maintenance log | 09:58 | Relay East's clock is six minutes **fast** relative to stable world time | Directly inspected clock reference |
| E | Offline cache index | 10:03 | `parcel-7` was queued for later replay | Archived by a second operator; not yet verified |
| F | Neutral witness marker | 10:05 | Vault South had not yet completed the intake handshake | Earned from a genuinely different source |

The answer is **not** "B is earlier, so B is fake." A player must reason that the relay clock offset changes its true time to 10:02, and that a receipt may mean *queued* rather than *accepted*. Which hypothesis is justified depends on which provenance and semantics were earned; a single unsourced forward is never an authoritative answer. The final authored case must have **one defensible proposition, one fair independent corroboration route, at least two plausible initial interpretations and an abstain option**. Edit the sample during review if it proves underdetermined; do not code around ambiguity with secret hidden rules.

Minimum playtest criterion: a newcomer can point to two records and explain the causality **in their own words**, not just guess a green badge.

## 3. Existing world facts versus missing plumbing

**Verified live systems:**

- `WorldState.targets`, machines and services have distinct generated IDs; `generate-scenario.ts` seeds changing organizations, targets and social ties.
- `WorldState.evidence` records target/machine/service observations and optional retirement; `CommandBus` owns charged survey/inspect and world time.
- `analysis.ts` supplies *fallible* predictions, not trustworthy evidence. A confident AI assertion is not a fact.
- `investigations.ts` produces surfaced authority signals from **player-created traces** at 360-minute review boundaries. The private `progress`, `sourceIds`, hidden case cause and deadlines do not reach `VisibleInvestigation`.
- `probes.ts` records potentially wrong rival beliefs and exposes only artifact/time through `VisibleProbe`, not actor identity or belief correctness.
- `network-routes.ts` and `project-world.ts` show the existing boundary: authoritative state, read-only player-safe projection, shared GUI/terminal CommandBus verbs.

**Missing:** an authoritative scoped forensic case record; synthetic log-entry producer; independent receipt/clock-reference acquisition; a player-own-rig forensic view; correlation commands and side-effect contracts. **Don't** label current `InvestigationSignal` or `RivalProbe` an actual log before this new source exists. No present generalized self-target `TargetState`; don't pretend own-rig uses a target-intrusion adapter.

## 4. Provider independence and seed-safe content

**Provider A — generated target incident:** An eligible generated target (at least two distinct relevant service/clock sources) can supply a case only after the player legitimately identifies a target and earns specific machine/service observations. The provider creates 4–6 *fictional*, source-attributed records and one hidden case truth from its own stable seed salt. Cases not satisfiable by the generated topology are **not attached**. A false claim may originate from an NPC/broker message; the source must remain explicitly uncertain. This must NOT overwrite general `EvidenceRecord` or reveal unreached target machines.

**Provider B — player-side counterinvestigation:** A surfaced authority signal, rival-probe tell or physical warning may trigger a *different* defensive case whose logs come from the **player's** simulated computer/contact artifacts. The player already has a reason to question whether a warning is spoofed; a new bounded `own-rig` provider synthesizes the *readable* receipt/reference records from permitted observables. Actor ID, rival probe correctness, investigation progress, and future threat triggers remain hidden. If actual player-side log acquisition cannot be integrated without adding an unrelated device/permission model, **stop and declare two-provider acceptance blocked** instead of copying Provider A and renaming IDs.

Only the *case inference and action policy* are shared. Providers own source acquisition, scenario interpretation, and appropriate response effects. Neither Nightshade nor its narrative files may own the evaluator.

## 5. Domain proposal (illustrative names, not implementation commitment)

~~~ts
type ForensicScope =
  | { kind: "target"; targetId: string }
  | { kind: "own-rig"; artifactId: string };

type CaseEntry = {
  id: string;
  sourceId: string;                    // fictional source, not a secret NPC identity
  reportedMinute: number;             // untrusted timestamp, deliberately offset when relevant
  observedWorldMinute: number | null; // when player earned it, never a future source
  claimId: string;                     // enumerated fictional assertion/template
  sourceCue: "observed" | "forwarded" | "derived";
  epoch: number;
};

type ForensicCase = {
  id: string;
  scope: ForensicScope;
  entries: CaseEntry[];               // authoritative pool, visibility tracked separately
  visibleEntryIds: string[];
  epoch: number;
  hypotheses: Array<{ claimId: string; supportIds: string[]; outcome: "refuted" | "supported" | "stale"; worldMinute: number }>;
  // private solution/causal rule + optional source-retirement record
};

// Candidate command family; exact signatures only after approved plan:
forensicCorroborate(caseId, sourceId)
forensicAssert(caseId, claimId, supportIds)
forensicWithdraw(caseId, claimId)
~~~

A persisted case needs **only** data that cannot be derived from seed + already-authoritative world observations. In particular do not persist parallel "current truth" flags and guess counts when derivable; record every irreversible paid action with provenance. Case and record IDs scoped to `caseId`, seeded salts independent of unrelated NPC decisions; chronology and order stable across split/bulk waits. Validate entry uniqueness, source existence in appropriate scope, earned-before-shown timestamps, source/epoch attribution, decision outcome consistency and no future-clue projection for *current saves only*. Historical-save migration is **not a project gate** per user directive.

The candidate types above are a review target, **not** permission to edit `WorldState`, schema, events or command union yet.

## 6. Playable verbs, cost/risk, and recoverability

- **Read/sort/compare:** free; chronological ordering, view by source and two-record compare do not advance world time. GUI cards and terminal table both show explicit source kind, in-world time and uncertainty, never a hidden truth boolean.
- **Request corroboration:** authoritative typed command, *proposal* 12 world minutes + 1 unit of bounded compute for local verification; a contact route may instead cost 120 minutes and limited trust, with a different clue. Resource shortage blocks **before** cost; preview must agree exactly with actual charge. No passive source omniscience.
- **Assert:** submit a chosen **claim + at least two source IDs** with an explicit spend/risk preview; a valid assertion is charged even when wrong. A correct action may unlock an earned clue, safer countermeasure or a contract lead. An incorrect action increases bounded contact distrust/attention or targeted footprint as justified by the *provider*, but never produces an arbitrary instant ending.
- **Withdraw/decline:** reversible/socially meaningful retreat. Already-spent time and reputation do not magically disappear. Reject duplicate same-epoch claims without free farming.
- **Re-evaluate after new evidence:** old failed hypotheses remain readable; player can amend or overturn a conclusion at a real time cost. A defensive response and an accusation against a target must have *different appropriate* consequences, not a shared "+1 trace on external target" shortcut.

**Temporal truth:** a defender/peer may retire a source or rotate its clock context on the existing authoritative tick. A 12-minute verification straddling that tick must resolve tick events in existing CommandBus order before a verdict; affected submission becomes `stale`, still pays appropriate elapsed time but never reveals the new hidden solution for free. First-ending-wins halts later success. No side-effect outside CommandBus and no parallel realtime countdown timers.

### Player-safe evidence states

Use **unseen**, **reported**, **corroborated**, **challenged**, and **stale** as semantic UI labels. `reported` means someone said it; `corroborated` means player found independent sources; neither is an unconditional "the accusation is true." Source reliability cues should be legible to non-specialists; no color-only confidence encoding. If a record was never earned, its claim/ID must not leak via projection, UI markup, save preview or terminal output. Hidden NPC attribution and true time offset stay private until a player action actually earns them.

## 7. Player experience and UI/terminal parity

The proposed Recon **Evidence Desk** shows 4–6 records in a sortable horizontal/vertical timeline, a two-source comparison lane, context for timestamp offset and a prominent cost/risk preview. At 390px the compare view must stack, not hide references off-screen. Keyboard-only navigation, focus restoration, screen-reader source labels, accessible status messaging and non-color uncertainty cues are acceptance requirements. It is part of the operating system metaphor, **not** a modal minigame hosted by Nightshade.

Terminal example intent (syntax subject to plan review): `forensics cases`, `forensics read <case>`, `forensics compare <case> <entryA> <entryB>`, `forensics corroborate <case> <source>`, `forensics assert <case> <claim> <sourceA> <sourceB>`, `forensics withdraw <case> <claim>`. Parsing validates tokens but cannot evaluate truth independently. GUI and terminal dispatch exactly the same typed commands and emit identical event/time/evidence changes.

World interaction must remain optional: a player can choose another way to solve a job, ignore an unsafe case, or leave an investigation without a mandatory five-step puzzle chain. Never introduce player/target rank as a capability requirement.

## 8. TDD and genuine acceptance gates, NOT run

1. **Prerequisite design approval**: user selects P2 mechanic family and approves the written P2 spec. Only then author a separately reviewed file-by-file TDD plan (RED first); no feature code in the present PR.
2. **Feasible independent providers:** one real G2 generated target and one real player-defense investigation case are created from their own relevant world sources; same core solver, no Nightshade imports, no renamed target fixture. If either fails, the feature is NOT reusable and must not ship.
3. **Reasoning vs click puzzle:** 4–6 accessible records, at least one clock-offset/causal semantic ambiguity, two plausible claims, two independently earned supporting sources, an abstain option; false inference recoverable and charged. No single record announces the answer.
4. **Provenance/security:** no hidden target machine, NPC identity, private case progress, future epoch or unearned source leaks via player-safe projection/terminal/UI. Strong tests for unknown case/source, forged evidence IDs and stale epochs.
5. **Clock, failure and resource fairness:** split/bulk time equivalence, no duplicate charge or double-NPC response, preview=actual, insufficient-resource no-op, epoch change while action executes, no actions after ending.
6. **Current-run persistence and determinism:** strict validation of new records, save/resume replay, fixed-seed case solvability/variety (at least 120 generated seeds), ranks 1 and 999999 yield equal mechanical outcomes. **Do not budget historical version migrations.**
7. **Game verification:** Node 24 focused/full tests + typecheck/lint/production build; real Chromium desktop + 390px mobile and keyboard, both independent providers; 0 JS errors. Separately conduct real unfamiliar 20–30-minute human gameplay observation and record wrong turns/time spent, NOT inferred from automation.
8. **Quality measure:** novice can cite the two decisive evidence sources and justify their conclusion, distinguish reported vs corroborated and understand why a wrong assertion cost time/standing. One-button solved or screenshot-only UI = FAIL.

## 9. Scope boundary and approval checklist

**Explicitly excluded:** full OS filesystem; generic plugin/puzzle framework; real network traffic/log parsers; real endpoint access/exploits; mandatory puzzle gates for all missions; Nightshade-specific solver; camera/city/travel/isometric rewrite; Tauri; retroactive old-save migration; performance-only cosmetic churn.

### Decisions for the reviewer

- [ ] **Mechanic selection:** choose Log Forensics instead of Packet Pattern, Untrusted Drop or different G3 work; explicitly acknowledge no novice G3 human playtest yet.
- [ ] **First-world use:** generated target plus defensive own-rig context (two real consumers), rather than two renamed target incidents.
- [ ] **Game-feel loop:** source comparison, time-consuming corroboration, evidence-backed accusation, abstention, and bounded recoverable downside.
- [ ] **Risk policy:** provider-appropriate player/NPC consequences and clock-bound stale assertions without leaked truth.
- [ ] **Written spec approval:** only after review, proceed to a separate test-first implementation plan and its own approval.

**This file and #110 represent open design questions, not a shipping commitment.** Merge of a docs PR is not approval to write gameplay code unless the user explicitly says so.
