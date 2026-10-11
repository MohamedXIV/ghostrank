# G6 P0 — First-contact Recon is sourced from what the player actually knows

**Issue:** #153 · **Parent:** #82 (G6 game-first UX) · **PR:** #154.

## Player-observed failure (from code audit, not a human playtest)
The original Recon opening hardcoded `nightshade` in the target input, unresolved-lead banner, contextual hint and topology fallback **regardless of scenario**. Field Directives likewise hardcoded `observe nightshade`, `survey nightshade` and displayed a generic contract placeholder. In a seeded Fresh Scene / High Pressure world these strings suggest a target that was never generated: a dead first click and disorienting first minutes.

## Corrected first-contact loop
`deriveOpeningReconCue` is a small pure player-facing decision helper that reads only the already-authorized TinyBase **visible contract rows**, or genuinely observed target IDs. It prioritizes a player-accepted contract, then the earliest unexpired visible offer, then stable contract IDs. It does not read `WorldState.targets`, peer ownership, hidden NPC knowledge, or guess a starting target. A blank/expired board honestly displays **no public target yet** and refers the player to the Underground Index; an authored Nightshade briefing still suggests Nightshade, **only because its visible real offer actually names that target**. A completed contract cannot be suggested as a new lead.

Recon input, hint, unresolved/observed status and progressive Field Directives now reuse this exact cue. The directives distinguish `op open <observed-target>` from `survey <active-target>`, recommend an actually mapped machine for inspection, and show the real contract ID when available. Editing the Recon input is an explicit player override; it never writes hidden truths or simulates facts. An unsuccessful first OBSERVE gives a short live, accessible refusal explaining how to choose an actual target; it does not consume world time or reveal the existence of guessed targets.

## Prove / do not claim
- Unit coverage: authored Nightshade, 120 distinct generated scene-seed combinations, expired/missing/completed/malformed offers, priority/tie ordering and observed-only fallback. Directive progression tests on live-looking projections.
- Existing full Node24 CI, Typecheck, lint, Next production build; Chromium actual first-minute generated scenarios, mistaken target refusal, phone 390px, existing Network Mapping unchanged.
- **Not claimed:** new hacking mechanic, wider operation variety, unfamiliar human blind usability acceptance or gameplay fun measurement. G6 #82, G3 #79, G8 #84 and Game-First #75 stay open; G3 P2 proposal #110 and draft PR #116 remain unapproved and untouched.
