# G3 — Unassisted Human Playtest Protocol (NOT RUN)

**Status:** preparation only; **0 human sessions observed**. Engineering Network Mapping is merged in PR #108; this document cannot itself pass #105, #79, #76 or #75.  
**Owners:** G3 #79 / P1 #105, G0 #76 and Game-First #75.  
**See:** `docs/G3_NETWORK_MAPPING_ACCEPTANCE.md`, `docs/GAME_FIRST_VERTICAL_SLICE.md`, D072/D073.

## Purpose and evidence boundary

Test whether a genuinely unfamiliar player can discover, reason about and recover from a fictional network operation **without instructions on which route to choose**. Check whether the mechanic feels like consequential investigation, not just colored cards or a memorize-the-label exercise. A 35-assertion Chromium automation run proves buttons execute; it does not count as a human or measure understanding.

A valid session uses an observer and a player unfamiliar with Nightshade, the correct routes and the code. Record the actual build SHA, browser/viewport, scenario/seed, world-clock start/end, and the player's words/choices. Never invent responses or mark the gate PASS based on a rehearsed developer run.

## Session setup

- Use a built, working **web** game, ordinary desktop keyboard/mouse. Capture a 390px touch session separately if available, but do not conflate automation with human touch testing.
- Give only this neutral prompt: **"You're an anonymous operator. Explore the computer and decide how you want to investigate this lead. You can stop or change approach at any time. Please say what you think is happening."**
- Do **not** give route names, commands, clue locations, secret criteria, timings, correct candidates, or the quiet/intrusive comparison. If stuck, ask "What do you expect this control to do?" instead of coaching a solution. Record any unavoidable hint verbatim and mark that attempt *assisted*.
- Ask the player to choose a handle and scenario; prefer the authored introductory Nightshade as the first attempt. If they complete/understand it, offer a separate Fresh Scene investigation without showing the correct answer. No forced route or guaranteed win. Record if the second consumer is not reached.
- Observer can capture screen and anonymous notes with player permission. Do not collect personal details or require real-world cybersecurity expertise.

## Timebox (20–30 real minutes, not in-world time)

| Window | Observer watches; player decides |
| --- | --- |
| 0–5 min | First impressions: identify a goal, locate a lead, open a fictional operation, notice that world time matters |
| 5–15 min | Discover source clues; form a route hypothesis; compare a quiet/waiting versus intrusive/time-risk path if the player notices them |
| 15–23 min | Attempt a route; observe costs, incorrect guesses or defense rotation if they arise; recover, withdraw, or continue without prompting |
| 23–30 min | Inspect results/footprint/NPC response; try the independent generated target if practical; short post-session questions |

Do not manufacture a failure or rotate a defender just to tick a checklist. Unseen events are recorded as *not observed*, not as successful acceptance.

## Raw event record (one row per meaningful decision)

| Real elapsed | World minute | Scenario + seed | What the player saw/said | Command or UI action | Intended hypothesis | Actual cost + feedback | Defender/NPC consequence | Assisted? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [fill from a real session] | | | | | | | | |

Preserve a replayable command/time-driver sequence when practical; if unavailable, record each GUI intent with IDs and the resulting visible timestamp. Avoid copying hidden challenge truth into the player's evidence transcript.

## Debrief questions (ask after play, without suggesting answers)

1. What were you trying to achieve, and how did you know which target mattered?
2. Which two pieces of evidence made one route more plausible? Could you describe the connection in your own words?
3. What did waiting buy you? What did a riskier investigation buy you? What did each cost?
4. What happened after your last decision, and which consequence felt fair or surprising?
5. If you tried a different target, did the same mechanics make sense without Nightshade-specific instructions?
6. Which screen, word or action caused confusion, repetitive work or an uninteresting wait? Would you choose to play again?

## Acceptance decision

**Record PASS, FAIL or NOT OBSERVED for each criterion, with a timestamp/quote:**

- The player recognizes a lead and an operation goal without hand-holding.
- The player finds and meaningfully interprets two sourced clues, rather than guessing a route from UI decoration.
- At least two legitimate approaches are recognized as choices with distinct time/trace or NPC outcomes; ability to stop/retreat remains clear.
- At least one meaningful mistake or changed clue (if it naturally occurs) is explainable and recoverable, not an arbitrary loss.
- Time expenditure and at least one NPC response or credible threat are perceived by the player and connected to prior actions.
- Network Mapping remains understandable in the independent non-Nightshade consumer (if played).
- No hidden truth leakage, critical save failure, inaccessible control, or terminal/GUI contradiction observed.

**Gate outcome:** One unfamiliar 20–30-minute unassisted session is required to assess the G3 P1 human gate, but a session alone is not automatically PASS. If major confusion or shallow single-click guessing is observed, keep #105/#79 open, file a reproducible gameplay fix, and retest after correction. A second scenario not reached is **NOT OBSERVED**, not automatically PASS. #75/#84 require their broader, separate tests.

## Result form — empty until a session actually occurs

- Date / observer / anonymous player familiarity:
- Build SHA / browser / viewport / input device:
- Scenario / seed / world-minute interval:
- Duration; assistance/hints:
- First meaningful decision (real elapsed):
- Clues inferred in player's own words:
- Routes/approaches explored, failures and recovery:
- World-time/trace tradeoff recognized:
- NPC response noticed:
- Independent consumer attempted?:
- Critical friction and reproducible steps:
- Per-criterion PASS / FAIL / NOT OBSERVED:
- Follow-up issue(s), owner and replay trace:
- **Final human G3 gate: NOT RUN (until actual evidence replaces this line).**
