use serde::Deserialize;
use sqlx::SqlitePool;
use tauri::State;
use tauri_plugin_sql::{DbInstances, DbPool};

use crate::DATABASE_URL;

const ACTIVE_RUN_ID: &str = "ghostrank-active-run";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedEventInput {
    id: String,
    world_minute: i64,
    event_type: String,
    payload_json: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveActiveRunRequest {
    snapshot_id: String,
    created_at: String,
    world_minute: i64,
    state_json: String,
    events: Vec<PersistedEventInput>,
}

#[tauri::command]
pub async fn save_active_run(
    db_instances: State<'_, DbInstances>,
    request: SaveActiveRunRequest,
) -> Result<(), String> {
    let pool = {
        let instances = db_instances.0.read().await;
        let db = instances
            .get(DATABASE_URL)
            .ok_or_else(|| format!("database not loaded: {DATABASE_URL}"))?;

        match db {
            DbPool::Sqlite(pool) => pool.clone(),
            #[allow(unreachable_patterns)]
            _ => return Err("Ghostrank requires the SQLite database backend".to_string()),
        }
    };

    save_active_run_on_pool(&pool, &request)
        .await
        .map_err(|error| error.to_string())
}

async fn save_active_run_on_pool(
    pool: &SqlitePool,
    request: &SaveActiveRunRequest,
) -> Result<(), sqlx::Error> {
    let mut transaction = pool.begin().await?;

    sqlx::query(
        r#"
        INSERT INTO runs (
            id,
            created_at,
            ended_at,
            status,
            schema_version
        )
        VALUES (?1, ?2, NULL, 'active', 1)
        ON CONFLICT(id) DO UPDATE SET
            ended_at = NULL,
            status = 'active',
            schema_version = 1
        "#,
    )
    .bind(ACTIVE_RUN_ID)
    .bind(&request.created_at)
    .execute(&mut *transaction)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO snapshots (
            id,
            run_id,
            world_minute,
            state_json,
            schema_version,
            created_at
        )
        VALUES (?1, ?2, ?3, ?4, 1, ?5)
        "#,
    )
    .bind(&request.snapshot_id)
    .bind(ACTIVE_RUN_ID)
    .bind(request.world_minute)
    .bind(&request.state_json)
    .bind(&request.created_at)
    .execute(&mut *transaction)
    .await?;

    for event in &request.events {
        sqlx::query(
            r#"
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
            VALUES (?1, ?2, ?3, ?4, ?5, 1, NULL, ?6)
            "#,
        )
        .bind(&event.id)
        .bind(ACTIVE_RUN_ID)
        .bind(event.world_minute)
        .bind(&event.event_type)
        .bind(&event.payload_json)
        .bind(&request.created_at)
        .execute(&mut *transaction)
        .await?;
    }

    sqlx::query(
        r#"
        DELETE FROM snapshots
        WHERE run_id = ?1
          AND rowid NOT IN (
            SELECT rowid
            FROM snapshots
            WHERE run_id = ?1
            ORDER BY world_minute DESC, created_at DESC, rowid DESC
            LIMIT 50
          )
        "#,
    )
    .bind(ACTIVE_RUN_ID)
    .execute(&mut *transaction)
    .await?;

    transaction.commit().await
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn create_test_pool() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("in-memory SQLite should connect");

        for statement in [
            r#"
            CREATE TABLE runs (
                id TEXT PRIMARY KEY NOT NULL,
                created_at TEXT NOT NULL,
                ended_at TEXT,
                status TEXT NOT NULL,
                schema_version INTEGER NOT NULL CHECK (schema_version > 0)
            )
            "#,
            r#"
            CREATE TABLE snapshots (
                id TEXT PRIMARY KEY NOT NULL,
                run_id TEXT NOT NULL,
                world_minute INTEGER NOT NULL CHECK (world_minute >= 0),
                state_json TEXT NOT NULL,
                schema_version INTEGER NOT NULL CHECK (schema_version > 0),
                created_at TEXT NOT NULL,
                FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
            )
            "#,
            r#"
            CREATE TABLE events (
                id TEXT PRIMARY KEY NOT NULL,
                run_id TEXT NOT NULL,
                world_minute INTEGER NOT NULL CHECK (world_minute >= 0),
                event_type TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                schema_version INTEGER NOT NULL CHECK (schema_version > 0),
                correlation_id TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
            )
            "#,
        ] {
            sqlx::query(statement)
                .execute(&pool)
                .await
                .expect("test schema should initialize");
        }

        pool
    }

    fn request(events: Vec<PersistedEventInput>) -> SaveActiveRunRequest {
        SaveActiveRunRequest {
            snapshot_id: "snapshot-1".to_string(),
            created_at: "2026-10-02T12:00:00Z".to_string(),
            world_minute: 20,
            state_json: r#"{"worldMinute":20}"#.to_string(),
            events,
        }
    }

    fn runtime() -> tokio::runtime::Runtime {
        tokio::runtime::Runtime::new().expect("test runtime should initialize")
    }

    #[test]
    fn commits_snapshot_and_events_together() {
        runtime().block_on(async {
            let pool = create_test_pool().await;
            let input = request(vec![PersistedEventInput {
                id: "event-1".to_string(),
                world_minute: 20,
                event_type: "WorldTimeAdvanced".to_string(),
                payload_json: "{}".to_string(),
            }]);

            save_active_run_on_pool(&pool, &input)
                .await
                .expect("valid save should commit");

            let snapshot_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM snapshots")
                .fetch_one(&pool)
                .await
                .expect("snapshot count should query");
            let event_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM events")
                .fetch_one(&pool)
                .await
                .expect("event count should query");

            assert_eq!(snapshot_count, 1);
            assert_eq!(event_count, 1);
        });
    }

    #[test]
    fn rolls_back_the_whole_save_when_an_event_fails() {
        runtime().block_on(async {
            let pool = create_test_pool().await;
            let input = request(vec![PersistedEventInput {
                id: "event-invalid".to_string(),
                world_minute: -1,
                event_type: "WorldTimeAdvanced".to_string(),
                payload_json: "{}".to_string(),
            }]);

            assert!(save_active_run_on_pool(&pool, &input).await.is_err());

            let run_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM runs")
                .fetch_one(&pool)
                .await
                .expect("run count should query");
            let snapshot_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM snapshots")
                .fetch_one(&pool)
                .await
                .expect("snapshot count should query");
            let event_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM events")
                .fetch_one(&pool)
                .await
                .expect("event count should query");

            assert_eq!(run_count, 0);
            assert_eq!(snapshot_count, 0);
            assert_eq!(event_count, 0);
        });
    }
}
