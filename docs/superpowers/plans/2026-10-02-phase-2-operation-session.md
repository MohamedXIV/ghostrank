# Phase 2 P0 — Capability composition + operation session/escalation

Issue: #12
Parent: #7
Dependency: #10 complete

## Goal

Make reconnaissance capabilities part of an explicit operation lifecycle instead of free-floating commands.

The session is fictional game state. It does not represent real network access.

## State

At most one active operation exists:

    operation:
      targetId
      stage: recon | intrusive
      openedWorldMinute
      escalatedWorldMinute?

Legacy saves normalize missing operation state to null.

## Commands

### openOperation(targetId)

Requires:
- target exists
- target-profile evidence exists
- no active operation

Produces:
- active operation at stage recon
- OperationOpened event

Time:
- zero; selecting/committing to an operation is state context, not a capability execution.

Failures:
- TARGET_NOT_FOUND
- TARGET_NOT_OBSERVED
- OPERATION_ALREADY_ACTIVE

### surveyTarget(targetId)

New Phase 2 rule:
- requires an active operation
- requested target must equal operation target
- retains Phase #10 evidence/time behavior

Additional failures:
- NO_ACTIVE_OPERATION
- OPERATION_TARGET_MISMATCH

### inspectMachine(machineId)

New Phase 2 rule:
- requires an active operation
- machine must belong to operation target
- retains Phase #10 evidence/time behavior

Additional failures:
- NO_ACTIVE_OPERATION
- OPERATION_TARGET_MISMATCH

### escalateOperation

Requires:
- active operation
- stage recon
- at least one known fictional service belonging to the operation target

Produces:
- stage intrusive
- 5 world minutes
- WorldTimeAdvanced + OperationEscalated

Failures:
- NO_ACTIVE_OPERATION
- OPERATION_ALREADY_ESCALATED
- SERVICE_EVIDENCE_REQUIRED

No exploitation command is added here. Intrusive is only an explicit domain boundary for later capability work.

### disengageOperation

Requires:
- active operation

Produces:
- clears active operation
- 3 world minutes
- WorldTimeAdvanced + OperationDisengaged

Failures:
- NO_ACTIVE_OPERATION

## Interfaces

Terminal:
- `op open <target-id>`
- `op escalate`
- `op exit`

Recon GUI:
- OPEN OPERATION on known target
- ESCALATE / DISENGAGE in active operation status

All UI paths construct the same typed simulation commands.

## TDD order

1. Red tests for operation lifecycle and invalid transitions.
2. Update reconnaissance tests to require active matching operation.
3. Red parser tests for operation commands.
4. Red restart test for active operation stage.
5. Implement state/schema/commands/events.
6. Enforce operation context in recon capabilities.
7. Project active operation into TinyBase.
8. Wire Terminal/Recon GUI parity.
9. Exact-head web + Rust/Tauri CI.
