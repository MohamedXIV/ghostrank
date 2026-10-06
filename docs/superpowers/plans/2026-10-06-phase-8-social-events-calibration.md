# Phase 8 P6 — Social/event breadth + alpha calibration

Parent: #26  
Depends on: P0–P5 in order (D044–D049).

## Goal

Finish Content Alpha by making repeated runs feel socially less repetitive, then
use the deterministic P1 harness to calibrate pacing **from measurements** rather
than by intuition.

P6 has two intentionally separate layers:

1. social/event presentation breadth that must not alter world truth;
2. explicit alpha calibration that may tune existing probabilities/authoring
   values only after a valid before/after telemetry report exists.

## P6A — authored social/event presentation

The authoritative social world already contains:

- public NPC incidents;
- accurate/inaccurate incident rumors;
- inbox messages relaying those rumors;
- contract-completion forum posts;
- unmasking-taboo forum posts;
- ambiguous physical signals.

P6A does not invent a second event engine. Instead,
`src/content/social-copy.ts` supplies several authored phrasings for the same
visible causal record.

Variant selection is:

- deterministic from the existing visible record id + presentation surface + visible causal handles/target where relevant;
- presentation-only (a private stable string hash, **not** simulation RNG);
- stable across save/load and split/whole waits because the underlying record id
  is stable;
- incapable of changing rank, relationships, events, deadlines, evidence,
  threat state, or persistence.

Surfaces broadened:

- public incident feed;
- rumor/inbox phrasing;
- forum incident commentary;
- forum contract-vouch phrasing;
- forum unmasking-taboo phrasing;
- authority-investigation signal wording;
- rival-probe tell wording;
- physical-signal wording.

The old forum copy also hardcoded the working handle `CobaltXZ`; P6 removes
that assumption and uses generic causal copy instead.

## P6B — social telemetry

Balance telemetry report schema advances from **v1 to v2** because P6 adds a new top-level scenario-summary dimension. It now records four additional sample/summary counters:

- public incidents;
- forum posts;
- rumors;
- messages.

These are observations of existing authoritative arrays. The telemetry policy
still writes none of them directly.

This gives calibration two dimensions it did not have before:

- **danger / economy / ending pressure** from the existing P1 report;
- **social density** from the new counters.

## P6C — alpha calibration gate

No balance constant is changed until the canonical 32-seed × four-policy ×
30-day report can run successfully on the final P5/P6 dependency chain.

Calibration may tune only existing authored/system values when the report
justifies it, for example:

- NPC authored `activity` percentages;
- contract offer density / existing bounded pressure bonuses;
- forum-comment / rumor-message presentation frequency;
- catalog prices/upkeep where economy telemetry shows an actual problem.

Calibration must **not**:

- weaken or bypass Phase 6/7 causal threat prerequisites;
- introduce rank gates, target levels, hidden difficulty multipliers, or
  catch-up cheats;
- mutate outcomes directly in the telemetry harness;
- add a new RNG stream or progression authority;
- tune solely to force a preferred ending distribution.

Every final tuning change must cite the measured problem it addresses and rerun
the same report afterward.

## Current measurement context

The P3 baseline below is **not** prose memory: it was regenerated locally at the
P3 merge (`563bd6a`) with a toolchain configuration byte-identical to this head,
and stored as a machine-readable v1 report so P6 could diff fields instead of
re-reading numbers. Across 32 seeds it recorded:

- idle: 32/32 active and no player-driven threat;
- contractor: 27 ARRESTED / 5 active;
- reckless: 30 ARRESTED / 1 STRANDED / 1 active;
- career-exit: 25 RETIRED / 2 VANISHED / 5 ARRESTED.

Every one of those figures reproduces exactly in the P6 v2 report, which is the
P4/P5 neutrality proof D048 and D049 asked for but had never been given.

P2 had already shown that the larger autonomous cast materially increased probe
traffic. P6 therefore treats ecosystem/social density as something to measure,
not something to silently normalize away.

## Calibration hypotheses — evidence queue, not tuning decisions

The last valid report already narrows what P6C needs to test, but it does not
justify changing a constant yet.

1. **Opportunity throughput may be a repetition problem before it is a danger
   problem.** Across the 32-seed P3 report, contractor completed 1,452 contracts
   (~45.38/run), reckless completed 1,267 (~39.59/run), and career-exit
   completed 682 (~21.31/run). The v2 report should be read alongside social
   density before offer cadence or pressure bonuses are changed.

2. **Probe volume may be denser than the player-facing counterplay can
   comfortably explain.** Contractor produced 1,981 probes (~61.91/run),
   reckless 1,790 (~55.94/run), and career-exit 733 (~22.91/run). Raw hidden
   probe count is not itself a defect: calibration must compare it with surfaced
   tells, physical signals, messages, postmortems and distinct actors before
   reducing or increasing rival activity.

3. **Scripted-policy run length is not a novice-run acceptance threshold.**
   Contractor's median is 31,860 minutes (~22.13 days), reckless 27,720
   (~19.25 days), and career-exit 23,344.5 (~16.21 days). GAME_DESIGN targets
   first runs around days 3–5 and treats 7–10 days as an early achievement, but
   these telemetry policies are tireless deterministic workers, not first-time
   humans. Human playtests remain the authority for that pacing target.

4. **The current policies cannot calibrate market affordability.** They do not
   buy P5 market content. Contractor median final credits (8,527.5) and rank
   improvement (28,730.5) describe contract throughput, not whether the expanded
   hardware/model/tool market is correctly priced.

When a valid v2 report is available, calibration should prefer the narrowest
lever supported by evidence: presentation-only forum/leak cadence first if the
problem is feed density; contract opportunity cadence if repeated obligations
dominate; authored actor activity only if autonomous-world crowding is the
measured issue; threat probabilities last, because Phase 6/7 causal fairness is
not a tuning shortcut.

## P6C outcome — measured, no calibration justified

The v2 report ran twice on the final head and hashed identically
(`sha256 2a641a0de5a5d08f87a6f8e9c0dce00478368c5177775f77173e89090e4e2c67`).
Against each hypothesis:

1. **Opportunity throughput — no defect.** Expired-over-created is 0.07%
   (contractor) and 0.08% (reckless); open offers average 0.63–2.0 per run
   against a 3–5 concurrent cap and a 20-row projection, so the board is never
   jammed. Idle legitimately expires 95.19% because it never accepts.
2. **Probe density — unreachable as written.** `projectProbes` maps every probe
   to a tell with no cap, so "probe with no surfaced signal" cannot occur.
   Contractor emits ~61.9 probes/run (2.81/day) and the residual question is UI
   readability, which the browser pass answered; `probes.ts` is not a calibration
   target.
3. **Run length vs novice pacing — answered by the playtest, not the report.** A
   scripted 16-day desktop session reached SEVERE footprint from ordinary play
   and read as a scene rather than a firehose; the visible windows measured in
   the live UI (feed 50 rows over 8.5 days, forum 30 over 8.5, inbox 30 over
   5.25) match the telemetry-derived windows.
4. **Market affordability — unmeasurable by design.** No policy buys content, so
   no price moves. Follow-up: a purchasing policy for the harness.

Social legibility, the genuinely new measurement: feed window 8.61–8.80 days,
inbox 5.76–6.07, forum 3.27–4.30, contract offers 156–706. Nothing crosses the
"consequential posts scroll off unread" line.

Two findings are recorded rather than tuned: **`known` and `entangled` pressure
bands never occur** (0 of 128 runs; the ladder is effectively binary because
active policies complete 21–45 contracts), and the alpha slice boots a **single
fixed seed** with no new-run control, so browser run-to-run variety comes from
player policy rather than seed selection. Both need their own decisions; neither
is a P6 lever.

## Verification

P6A tests pin:

- the same record id always renders the same copy;
- different ids actually produce more than one authored variant;
- actor/counterpart handles remain present in incident copy;
- investigation-signal variants preserve the visible target and keep a safe fallback;
- rival-probe variants preserve ambiguity and never expose hidden actor/correctness truth;
- physical-signal variants remain category-appropriate with a safe fallback;
- contract forum copy contains the target but never hardcodes the player handle.

P6B tests pin:

- social counters are present on every sample and summary and stay non-negative;
- the reckless multi-seed **sum** of each social counter is greater than zero
  (the other three policies are asserted non-negative, not non-zero);
- repeated seed/policy/horizon reports remain deep-equal.

P6C is delivered:

- [x] P5 is merged (`1b36234`, #53 / D049);
- [x] a valid full 32-seed telemetry report exists for the final P6 head, and a
      second independent capture hashes identically;
- [x] the P3 v1 report was regenerated on the same toolchain and the v2 report is
      field-identical after allowlisting `version`, `authoredContent` and
      `scenarios.*.social` (0 differing fields) — so P4/P5 neutrality is measured,
      and no before/after calibration evidence is needed because no constant moved;
- [x] full web tests (71 files / 748 tests), typecheck, lint and the production
      build are green on the exact head, plus a browser persistence/reload pass;
- [x] review findings reconciled (#54 carried no reviews or comments; the two
      defects found by actually running the gates — a stale P5 model-listing count
      and runner-sized wall-clock budgets — each got its own commit).

## Actions outage note

During P4/P5 work GitHub-hosted jobs intermittently failed before **any** job
step began. Those infrastructure failures are not treated as passing gates and
are not bypassed by blessing unexecuted code. Dependency-ready stacked work may
continue, but merge gates remain exact-head green checks.

The outage persisted through P6 and is now repo-wide and continuous since
`2026-10-05T23:04Z`: job `112057110909` shows `steps: []`, `runner_id: 0`, empty
`runner_name`/`runner_group_name` and no retrievable log, and `main`'s own push
(`37388207610`) is red the same way. The last two P6 commits are `[skip ci]`, so
no Actions run has ever existed for the verified head. The authoritative gates
therefore ran locally on a clean tree at that head; this bypasses the host, not
the checks. The earlier claim that run `37397578785` covered this head was wrong
— it ran `41b6bab`.
