// Prevents an extra console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod schema;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let path = dir.join("design-desk.db");
            let conn = db::open(&path)?;
            app.manage(db::Db(std::sync::Mutex::new(conn)));
            app.manage(commands::DataPath(path));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::db_list,
            commands::db_insert,
            commands::db_update,
            commands::db_delete,
            commands::list_projects,
            commands::create_project,
            commands::apply_template,
            commands::touch_project,
            commands::get_setting,
            commands::set_setting,
            commands::open_url,
            commands::data_location,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Design Desk");
}
