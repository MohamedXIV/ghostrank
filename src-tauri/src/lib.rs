mod migrations;
mod persistence;

pub const DATABASE_URL: &str = "sqlite:ghostrank.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DATABASE_URL, migrations::all())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![persistence::save_active_run])
        .run(tauri::generate_context!())
        .expect("error while running Ghostrank");
}
