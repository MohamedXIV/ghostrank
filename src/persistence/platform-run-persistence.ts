import { isTauri } from "@tauri-apps/api/core";

import type { RunPersistence } from "@/persistence/run-persistence";

export async function createPlatformRunPersistence(): Promise<RunPersistence> {
  if (isTauri()) {
    const { createSqliteRunPersistence } = await import(
      "@/persistence/sqlite-run-persistence"
    );

    return createSqliteRunPersistence();
  }

  const { createBrowserRunPersistence } = await import(
    "@/persistence/browser-run-persistence"
  );

  return createBrowserRunPersistence();
}
