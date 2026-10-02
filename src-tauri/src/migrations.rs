use tauri_plugin_sql::{Migration, MigrationKind};

pub fn all() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_foundation_tables",
        sql: r#"
            CREATE TABLE IF NOT EXISTS runs (
                id TEXT PRIMARY KEY NOT NULL,
                created_at TEXT NOT NULL,
                ended_at TEXT,
                status TEXT NOT NULL,
                schema_version INTEGER NOT NULL CHECK (schema_version > 0)
            );

            CREATE TABLE IF NOT EXISTS snapshots (
                id TEXT PRIMARY KEY NOT NULL,
                run_id TEXT NOT NULL,
                world_minute INTEGER NOT NULL CHECK (world_minute >= 0),
                state_json TEXT NOT NULL,
                schema_version INTEGER NOT NULL CHECK (schema_version > 0),
                created_at TEXT NOT NULL,
                FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY NOT NULL,
                run_id TEXT NOT NULL,
                world_minute INTEGER NOT NULL CHECK (world_minute >= 0),
                event_type TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                schema_version INTEGER NOT NULL CHECK (schema_version > 0),
                correlation_id TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_snapshots_run_world
                ON snapshots(run_id, world_minute);

            CREATE INDEX IF NOT EXISTS idx_events_run_world
                ON events(run_id, world_minute);
        "#,
        kind: MigrationKind::Up,
    }]
}
