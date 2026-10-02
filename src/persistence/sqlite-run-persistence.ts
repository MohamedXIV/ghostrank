import type { SimulationEvent } from "@/game/simulation/events/types";
import type { WorldState } from "@/game/simulation/state/world-state";
import { openGameDatabase } from "@/persistence/database";
import type { RunPersistence } from "@/persistence/run-persistence";
import { worldStateSchema } from "@/persistence/world-state-schema";

const ACTIVE_RUN_ID = "ghostrank-active-run";

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
          ORDER BY snapshots.world_minute DESC, snapshots.created_at DESC
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
      const snapshotId = `${ACTIVE_RUN_ID}:snapshot:${crypto.randomUUID()}`;

      await database.execute("BEGIN IMMEDIATE");

      try {
        await database.execute(
          `
            INSERT INTO runs (
              id,
              created_at,
              ended_at,
              status,
              schema_version
            )
            VALUES ($1, $2, NULL, 'active', 1)
            ON CONFLICT(id) DO UPDATE SET
              ended_at = NULL,
              status = 'active',
              schema_version = 1
          `,
          [ACTIVE_RUN_ID, createdAt],
        );

        await database.execute(
          `
            INSERT INTO snapshots (
              id,
              run_id,
              world_minute,
              state_json,
              schema_version,
              created_at
            )
            VALUES ($1, $2, $3, $4, 1, $5)
          `,
          [
            snapshotId,
            ACTIVE_RUN_ID,
            validated.worldMinute,
            JSON.stringify(validated),
            createdAt,
          ],
        );

        for (const event of newEvents) {
          const eventId = `${ACTIVE_RUN_ID}:event:${crypto.randomUUID()}`;

          await database.execute(
            `
              INSERT INTO events (
                id,
                run_id,
                world_minute,
                event_type,
                payload_json,
                schema_version,
                correlation_id,
                created_at
              )
              VALUES ($1, $2, $3, $4, $5, 1, NULL, $6)
            `,
            [
              eventId,
              ACTIVE_RUN_ID,
              eventWorldMinute(event),
              event.type,
              JSON.stringify(event),
              createdAt,
            ],
          );
        }

        await database.execute(
          `
            DELETE FROM snapshots
            WHERE run_id = $1
              AND id NOT IN (
                SELECT id
                FROM snapshots
                WHERE run_id = $1
                ORDER BY world_minute DESC, created_at DESC
                LIMIT 50
              )
          `,
          [ACTIVE_RUN_ID],
        );

        await database.execute("COMMIT");
      } catch (error) {
        await database.execute("ROLLBACK");
        throw error;
      }
    },
  };
}

function eventWorldMinute(event: SimulationEvent): number {
  switch (event.type) {
    case "TargetObserved":
      return event.worldMinute;
    case "WorldTimeAdvanced":
      return event.toMinute;
  }
}
