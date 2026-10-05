# Phase 7 P1 — Consequence-Driven Forced Endings

Issue: #25  
Decision: D038  
Depends on: P0 terminal run contract (D037 / #41).

## Scope

P1 makes the first forced endings reachable from causal truth Phase 6 already
stores. It adds no difficulty roll and no rank threshold.

Eligibility runs only after P4 has folded the physical consequences of the
current ecosystem boundary. A historical compromise from a pre-P1 save does not
retroactively kill the run.

## Ending map

### ARRESTED

Requires a current `identity-exposed` compromise whose cited investigation has
already surfaced the full player-visible `converging` band.

The ending cites that investigation. Hidden `progress` by itself is not enough:
if the player has not yet been shown the converging evidence, P1 does not rename
the event "arrest".

### UNMASKED

Requires a current `identity-exposed` compromise and a source physical threat
whose actor is the same actor that had already performed an `unmasking`
retaliation.

A different peer's prior unmasking does not rewrite the physical event.

### MISSING

Fallback for current physical `identity-exposed` when neither the authority
history nor same-actor social-unmasking history supports a stronger label.

The ending cites the physical threat that actually reached the person.

### STRANDED

Consumes P4's existing `stranded` condition. P4 has already proved the explicit
resource floor, so P1 does not duplicate the credits/property test.

### COMPROMISED

Requires both `rig-lost` and `dwelling-lost` on the same current boundary.

Either loss by itself remains recoverable. The ending cites the latest relevant
P4 compromise on that boundary while the rest of the causal truth remains in the
final state for postmortem/history derivation.

## Priority

If one boundary produces several eligible endings:

1. identity exposure (ARRESTED / UNMASKED / MISSING);
2. STRANDED;
3. generic COMPROMISED.

The first call to D037's `endRun` wins permanently.

## Exact-tick terminal chronology

A forced ending can happen in the middle of one large `advanceTime` command.
The requested destination is **not** authoritative once the run ends.

At an ecosystem boundary:

1. upkeep / investigations / strictly-earlier build work fold to the tick;
2. P3 physical retaliation acts;
3. P4 records catastrophic conditions;
4. P1 evaluates forced endings;
5. if ended, the ecosystem tick breaks immediately.

When step 5 happens:

- social retaliation does not run;
- contract offers do not run;
- the current tick cannot create a new rival probe;
- a build due exactly on that tick does not complete after the ending;
- no later partial-tail upkeep, investigation, or build work executes;
- `WorldState.worldMinute` becomes the ending minute;
- `WorldTimeAdvanced.toMinute` becomes the ending minute.

Anything strictly earlier than the terminal boundary remains part of history.

## Compatibility

Only compromises with `record.worldMinute === current boundary` are considered.
This prevents a save written under Phase 6 — where compromise deliberately was
not terminal — from dying merely because it is opened by a newer executable.

Future migrations may choose a different explicit policy for completed historic
runs, but P1 does not silently reinterpret them.

## Verification

Dedicated P1 tests cover:

- ARRESTED from visibly converged cited authority evidence;
- UNMASKED only from the same physical actor's prior taboo retaliation;
- MISSING as the remaining identity-exposure branch;
- a different actor's unmasking not affecting the result;
- STRANDED from the P4 resource-floor condition;
- generic COMPROMISED requiring same-boundary rig + dwelling loss;
- either property loss alone remaining playable;
- no retroactive ending from historical compromise rows;
- rank independence;
- exact-boundary freeze during a long wait;
- exact-tick build completion being suppressed after terminality;
- no later retaliation/offers/probes on the ending tick;
- post-ending command rejection;
- first-ending-wins under duplicate evaluator calls.

The code-complete pre-doc gate passed 640/640 tests across 58 files, typecheck,
lint (pre-existing PostCSS warning only), and production build. Final
docs-complete CI is the merge gate.

## Out of scope

- voluntary retirement and exit-plan mechanics — P2;
- retirement ending variants and rare VANISHED — P3;
- completed-run archival/history — P4;
- long-run pressure — P5;
- exotic/quantum capability — P6;
- captured/killed/forced-disappearance labels until a concrete simulated cause
  exists for them.
