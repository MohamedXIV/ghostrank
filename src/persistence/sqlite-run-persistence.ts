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
    case "TargetObserved":
    case "OperationOpened":
    case "MachineObserved":
    case "ServiceObserved":
    case "OperationEscalated":
    case "OperationDisengaged":
    case "TraceRecorded":
    case "OpponentReactionTriggered":
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
    case "PlayerRankChanged":
    case "Retaliation":
    case "ForumPosted":
    case "ValueTransferred":
    case "HardwareAcquired":
    case "HousingChanged":
    case "SoftwareChanged":
      return event.worldMinute;
    case "WorldTimeAdvanced":
      return event.toMinute;
  }
}
