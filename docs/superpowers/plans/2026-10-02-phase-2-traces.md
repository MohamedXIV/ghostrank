# Phase 2 P0 — Traces, signatures + causal consequence chain

Issue: #14
Parent: #7
Dependency: #12 complete

## Goal

Make operation risk reconstructable. Consequential lifecycle choices leave deterministic fictional traces with explicit causes. Later opponent reactions consume this state rather than rolling hidden arbitrary danger.

## Trace model

A trace records:
- deterministic ID
- target
- cause
- operation stage
- severity
- world minute

Initial causes:
- `operation-escalation`
- `operation-disengagement`

Initial severity weights:
- recon disengagement: low / 1
- escalation into intrusive stage: high / 3
- intrusive disengagement: elevated / 2

These are fictional simulation abstractions, not real operational-security concepts.

## Derived footprint

The player can see a summary of their own operation footprint:
- score = sum of trace weights
- level:
  - 0 = none
  - 1-2 = low
  - 3-4 = elevated
  - 5+ = severe

The summary is deterministic and derived only from stored traces.

## Events

The command that creates a trace also emits `TraceRecorded` so the event log can explain the causal chain.

## Persistence

- traces are part of WorldState
- legacy snapshots default to `traces: []`
- save/restart preserves exact trace IDs and derived footprint

## TDD order

1. RED tests for early disengagement footprint.
2. RED tests for escalation + intrusive disengagement footprint.
3. RED determinism test for identical state + command sequence.
4. RED persistence/defaulting tests.
5. Implement typed traces, event emission, and derived footprint.
6. Project player-visible footprint through TinyBase.
7. Add read-only UI footprint panel.
8. Restart acceptance.
9. Exact-head web + Rust/Tauri CI.
