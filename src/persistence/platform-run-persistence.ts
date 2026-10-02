import { isTauri } from "@tauri-apps/api/core";

import type { RunPersistence } from "@/persistence/run-persistence";

export async function createPlatformRunPersistence(): Promise<RunPersistence | null> {
  if (!isTauri()) {
    return null;
  }

  const { createSqliteRunPersistence } = await import(
    "@/persistence/sqlite-run-persistence"
  );

  return createSqliteRunPersistence();
}
