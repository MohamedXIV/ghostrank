import { invoke } from "@tauri-apps/api/core";

import type { SimulationEvent } from "@/game/simulation/events/types";
import type { WorldState } from "@/game/simulation/state/world-state";
import { openGameDatabase } from "@/persistence/database";
import type { RunPersistence } from "@/persistence/run-persistence";
import { worldStateSchema } from "@/persistence/world-state-schema";

interface SnapshotRow {
  state_json: string;
}

export async function createSqliteRunPersistence(): Promise<RunPersistence> {
  const database = await openGameDatabase();

  return {
    async loadActiveState() {
      const rows = await database.select<SnapshotRow[]>(
        `
          SELECT snapshots.state_json
          FROM snapshots
          INNER JOIN runs ON runs.id = snapshots.run_id
          WHERE runs.status = 'active'
          ORDER BY
            snapshots.world_minute DESC,
            snapshots.created_at DESC,
            snapshots.rowid DESC
          LIMIT 1
        `,
      );

      const serialized = rows[0]?.state_json;

      if (!serialized) {
        return null;
      }

      return worldStateSchema.parse(JSON.parse(serialized));
    },

    async inspectActiveRun() {
      const rows = await database.select<SnapshotRow[]>(
        `
          SELECT snapshots.state_json
          FROM snapshots
          INNER JOIN runs ON runs.id = snapshots.run_id
          WHERE runs.status = 'active'
          ORDER BY
            snapshots.world_minute DESC,
            snapshots.created_at DESC,
            snapshots.rowid DESC
          LIMIT 1
        `,
      );

      const serialized = rows[0]?.state_json;
      if (!serialized) {
        return { status: "empty" as const };
      }

      try {
        const parsedJson = JSON.parse(serialized);
        const validated = worldStateSchema.safeParse(parsedJson);
        if (validated.success) {
          return { status: "valid" as const, state: validated.data };
        }
        return {
          status: "diagnostic_error" as const,
          error: {
            kind: "schema_validation_error" as const,
            message: "SQLite active run snapshot failed schema validation",
            details: validated.error.issues
              .slice(0, 5)
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; "),
          },
          rawContent: serialized,
        };
      } catch (err) {
        return {
          status: "diagnostic_error" as const,
          error: {
            kind: "corrupt_json" as const,
            message: err instanceof Error ? err.message : "Malformed JSON",
          },
          rawContent: serialized,
        };
      }
    },


    async saveActiveState(
      state: WorldState,
      newEvents: readonly SimulationEvent[],
    ) {
      const validated = worldStateSchema.parse(state);
      const createdAt = new Date().toISOString();

      await invoke("save_active_run", {
        request: {
          snapshotId: `ghostrank-active-run:snapshot:${crypto.randomUUID()}`,
          createdAt,
          worldMinute: validated.worldMinute,
          stateJson: JSON.stringify(validated),
          events: newEvents.map((event) => ({
            id: `ghostrank-active-run:event:${crypto.randomUUID()}`,
            worldMinute: eventWorldMinute(event),
            eventType: event.type,
            payloadJson: JSON.stringify(event),
          })),
        },
      });
    },
  };
}

function eventWorldMinute(event: SimulationEvent): number {
  switch (event.type) {
    case "NetworkRouteTested":
    case "SliceClueGranted":
    case "SliceReviewScheduled":
    case "SliceReviewRan":
    case "SliceEnded":
    case "TargetObserved":
    case "OperationOpened":
    case "MachineObserved":
    case "ServiceObserved":
    case "OperationEscalated":
    case "OperationDisengaged":
    case "TraceRecorded":
    case "OpponentReactionTriggered":
    case "OrganizationAgendaShifted":
    case "UndergroundActivity":
    case "ActorRankChanged":
    case "RelationshipChanged":
    case "RumorSpread":
    case "MessageDelivered":
    case "MessageRead":
    case "ContractOffered":
    case "ContractAccepted":
    case "ContractDeclined":
    case "ContractDelivered":
    case "ContractExpired":
    case "ContentReactionResolved":
    case "NarrativeOpened":
    case "NarrativeChoiceRecorded":
    case "InstitutionalCaseOpened":
    case "InstitutionalResponse":
    case "InstitutionalCaseMapped":
    case "InstitutionalCaseExpired":
    case "InstitutionalCaseResolved":
    case "OpportunityDiscovered":
    case "OpportunityExpired":
    case "OpportunityInvestigated":
    case "OpportunityResolved":
    case "PlayerRankChanged":
    case "Retaliation":
    case "ForumPosted":
    case "ValueTransferred":
    case "HardwareAcquired":
    case "HousingChanged":
    case "SoftwareChanged":
    case "PlayerToolAcquired":
    case "PlayerToolSold":
    case "MachineAcquired":
    case "MachineSold":
    case "MachineRenamed":
    case "ModelAcquired":
    case "ModelChanged":
    case "AnalysisCompleted":
    case "BuildStarted":
    case "BuildCompleted":
    case "BuildAborted":
    case "InvestigationAdvanced":
    case "RivalProbe":
    case "PhysicalThreat":
    case "NpcAssistantAdopted":
    case "CompromiseRecorded":
    case "RunEnded":
    case "RetirementPlanned":
    case "RetirementCoolingStarted":
    case "RetirementCancelled":
      return event.worldMinute;
    case "WorldTimeAdvanced":
      return event.toMinute;
    case "TimeJobStarted":
      return event.startedWorldMinute;
    case "TimeJobProgressed":
    case "TimeJobCompleted":
    case "TimeJobInterrupted":
    case "TimeJobCancelled":
      return event.worldMinute;
  }
}
