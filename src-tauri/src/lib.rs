mod migrations;

pub const DATABASE_URL: &str = "sqlite:ghostrank.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DATABASE_URL, migrations::all())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running Ghostrank");
}
