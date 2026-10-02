export const GHOSTRANK_DATABASE_URL = "sqlite:ghostrank.db" as const;

export async function openGameDatabase() {
  const { default: Database } = await import("@tauri-apps/plugin-sql");

  return Database.load(GHOSTRANK_DATABASE_URL);
}
