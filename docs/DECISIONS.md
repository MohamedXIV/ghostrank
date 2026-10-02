# Design and Architecture Decisions

This file records decisions that should not be repeatedly reopened without new evidence.

## D001 — Working title

**Decision:** Ghostrank.

Status: working title, not guaranteed commercial name.

## D002 — Rank is not power

Rank measures reputation/visibility/history. It never creates a level gate.

Accepted.

## D003 — Starting sides

Use White and Black starting ecosystems/packages.

Do not ship Grey as a required third starting alignment.

Actions after the start remain unrestricted and determine reputation.

Accepted.

## D004 — Player mastery first

Character proficiency changes efficiency and quality, not fundamental permission to attempt targets.

Accepted.

## D005 — Hacking interaction

No universal Hack button and no one-roll success mechanic.

Operations are composed from capabilities and interpreted results.

Accepted.

## D006 — Interface parity

Terminal, GUI, purchased tools, and generated tools use the same simulation command/capability layer.

Accepted.

## D007 — Physical presentation

Include a small top-down/isometric physical space with a minimal avatar and limited movement.

Do not build an open-world walking layer.

Accepted.

## D008 — Main UI stack

Next.js + TypeScript.

Tailwind + shadcn/ui for UI foundation.

The original host assumption was a static export inside Tauri 2. The UI-stack decision remains accepted; host timing is superseded by D016.

## D009 — Physical renderer

Phaser 4 owns the room/world presentation only.

Accepted.

## D010 — State responsibilities

- Pure TypeScript simulation core: active authoritative gameplay state/rules.
- Zustand: ephemeral shared UI state.
- TinyBase: reactive/query read projection.
- Persistence adapter: durable saves/history/migrations.

The original implementation used SQLite through Tauri. Backend timing is superseded by D016; the separation of responsibilities remains accepted.

## D011 — AI-generated software

Represent player/AI-authored software as safe virtual workflow/IR.

Do not execute arbitrary generated host code.

Accepted.

## D012 — Run difficulty

Early runs are expected to be short and dangerous. Several in-game days can be a successful learning run.

Accepted.

## D013 — Retirement

Voluntary retirement/exit is a real operation and possible final objective.

A rare peaceful White VANISHED ending exists.

Accepted.

## D014 — Multiplayer

The social underground is simulated by NPCs. Multiplayer is deferred.

Accepted for initial/full single-player scope.

## D015 — Real-world operational fidelity

Use believable concepts but fictionalize commands, vulnerabilities, protocols, currencies, and harmful operational detail.

Accepted.

## D016 — Web-first completion; Tauri deferred

Complete Ghostrank as a web game before returning to desktop-host work.

For Phases 3–9:
- browser execution is the primary runtime,
- normal gameplay must not depend on Tauri/Rust/native APIs,
- durable browser persistence is implemented behind the existing persistence boundary (#18),
- web tests/typecheck/lint/build become the authoritative normal gameplay gates.

Retain the existing Tauri 2 and SQLite work, but defer further hardening, native persistence reconciliation, installer/packaging, and desktop distribution until the web game is feature-complete (#19 / Phase 10).

The future desktop build must host the same game and consume the same validated logical save contract rather than fork gameplay architecture.

Accepted 2026-10-03.

## Open decisions

These remain intentionally unresolved until implementation/playtesting provides evidence:

- exact world-time scale,
- exact ranking formula,
- exact visible proficiency labels,
- whether language names remain fully real or partly fictionalized,
- exact number of concurrent locations/rooms in content alpha,
- whether TinyBase is used for every projection or only query-heavy domains,
- exact balance of procedural versus authored NPCs,
- exact commercial model names versus fictional AI ecosystem,
- final art style and palette,
- final commercial title.
