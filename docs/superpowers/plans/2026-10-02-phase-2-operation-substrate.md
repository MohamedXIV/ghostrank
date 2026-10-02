# Phase 2 P0 — Operation truth + evidence knowledge substrate

Issue: #8
Parent: #7

## Goal

Establish the production operation-domain boundary before adding active reconnaissance or attack capabilities.

Authoritative truth may contain targets, machines, and fictional services that the player has not discovered. Player-facing projections must be justified by explicit evidence records rather than by direct access to truth.

## Domain direction

Truth graph:

    Target
      -> Machine
          -> Fictional Service

Knowledge graph:

    EvidenceRecord
      -> target-profile
      -> machine-presence
      -> service-presence

Evidence records carry observation time, confidence, and source. Projection code derives visible targets/machines/services from evidence and never exposes private truth fields.

## Compatibility

Phase 1 `knownTargetIds` is accepted as legacy input during this transition. Normalization converts those IDs into target-profile evidence. New code treats evidence as the player-knowledge authority.

No shipped save migration is required yet, but Phase 1 development snapshots must remain loadable.

## TDD order

1. Add red tests for hidden infrastructure and evidence-gated projection.
2. Add red tests for `observeTarget` recording target-profile evidence without infrastructure leakage.
3. Add schema tests for resumable operation truth/evidence and legacy normalization.
4. Implement typed operation truth and evidence models.
5. Make projection evidence-driven and add TinyBase machine/service tables.
6. Update the slice fixture to include typed hidden infrastructure.
7. Preserve save/load and restart behavior.
8. Expose known infrastructure in Recon without inventing new gameplay commands.
9. Run exact-head web + Tauri CI.
