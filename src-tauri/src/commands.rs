use crate::db::{self, Db, Res, Row};
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

pub struct DataPath(pub std::path::PathBuf);

fn lock<'a>(db: &'a State<Db>) -> Res<std::sync::MutexGuard<'a, rusqlite::Connection>> {
    db.0.lock().map_err(|_| "database lock poisoned".to_string())
}

#[tauri::command]
pub fn db_list(db: State<Db>, table: String, filter: Option<Row>, order: Option<Vec<String>>) -> Res<Vec<Row>> {
    db::list(&*lock(&db)?, &table, filter, order)
}
#[tauri::command]
pub fn db_insert(db: State<Db>, table: String, values: Row) -> Res<Row> {
    db::insert(&*lock(&db)?, &table, values)
}
#[tauri::command]
pub fn db_update(db: State<Db>, table: String, id: i64, values: Row) -> Res<Row> {
    db::update(&*lock(&db)?, &table, id, values)
}
#[tauri::command]
pub fn db_delete(db: State<Db>, table: String, id: i64) -> Res<()> {
    db::delete(&*lock(&db)?, &table, id)
}
#[tauri::command]
pub fn list_projects(db: State<Db>) -> Res<Vec<Row>> {
    db::list_projects(&*lock(&db)?)
}
#[tauri::command]
pub fn create_project(db: State<Db>, values: Row, use_template: bool) -> Res<Row> {
    db::create_project(&mut *lock(&db)?, values, use_template)
}
#[tauri::command]
pub fn apply_template(db: State<Db>, project_id: i64) -> Res<()> {
    db::apply_template(&*lock(&db)?, project_id)
}
#[tauri::command]
pub fn touch_project(db: State<Db>, id: i64) -> Res<()> {
    db::touch_project(&*lock(&db)?, id)
}
#[tauri::command]
pub fn get_setting(db: State<Db>, key: String) -> Res<Option<String>> {
    db::get_setting(&*lock(&db)?, &key)
}
#[tauri::command]
pub fn set_setting(db: State<Db>, key: String, value: String) -> Res<()> {
    db::set_setting(&*lock(&db)?, &key, &value)
}

/// Opens a link in the system browser. Only web/mail links are allowed.
#[tauri::command]
pub fn open_url(app: AppHandle, url: String) -> Res<()> {
    let u = url.trim();
    let lower = u.to_lowercase();
    if !(lower.starts_with("https://") || lower.starts_with("http://") || lower.starts_with("mailto:")) {
        return Err("only http(s) and mailto links can be opened".into());
    }
    app.opener().open_url(u, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn data_location(path: State<DataPath>) -> String {
    path.0.to_string_lossy().to_string()
}
