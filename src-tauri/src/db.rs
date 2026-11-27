//! Database access: connection setup, migrations and a small generic CRUD layer.
//!
//! The generic layer lets the frontend do list/insert/update/delete on a whitelisted
//! set of tables without a Rust command per entity. Table names come from a whitelist
//! and column names are validated against `PRAGMA table_info`, so nothing from the
//! frontend is ever interpolated into SQL unchecked; values are always bound parameters.

use crate::schema;
use rusqlite::{params_from_iter, types::Value as Sql, types::ValueRef, Connection};
use serde_json::{Map, Value};
use std::{path::Path, sync::Mutex};

pub struct Db(pub Mutex<Connection>);

pub type Res<T> = Result<T, String>;
pub type Row = Map<String, Value>;

const TABLES: &[&str] = &[
    "projects", "project_links", "process_stages", "process_items",
    "decisions", "resources", "ideas", "notes",
];
const NOW: &str = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

fn e<T: ToString>(err: T) -> String { err.to_string() }

pub fn open(path: &Path) -> Res<Connection> {
    let conn = Connection::open(path).map_err(e)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;").map_err(e)?;
    migrate(&conn)?;
    seed(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> Res<()> {
    let current = conn.query_row("PRAGMA user_version", [], |r| r.get::<_, i64>(0)).map_err(e)? as usize;
    for (i, sql) in schema::MIGRATIONS.iter().enumerate().skip(current) {
        conn.execute_batch(&format!("BEGIN; {sql} PRAGMA user_version = {}; COMMIT;", i + 1)).map_err(e)?;
    }
    Ok(())
}

fn seed(conn: &Connection) -> Res<()> {
    let seeded: bool = conn
        .query_row("SELECT 1 FROM settings WHERE key='seeded'", [], |_| Ok(true))
        .unwrap_or(false);
    if seeded { return Ok(()); }
    for (si, (stage, items)) in schema::DEFAULT_PROCESS.iter().enumerate() {
        conn.execute("INSERT INTO process_stages (project_id,name,position) VALUES (NULL,?,?)", (stage, si as i64)).map_err(e)?;
        let sid = conn.last_insert_rowid();
        for (ii, t) in items.iter().enumerate() {
            conn.execute("INSERT INTO process_items (stage_id,project_id,text,position) VALUES (?,NULL,?,?)", (sid, t, ii as i64)).map_err(e)?;
        }
    }
    for (name, url, cat, desc, notes) in schema::STARTER_RESOURCES {
        conn.execute(
            &format!("INSERT INTO resources (name,url,category,description,notes,created_at,updated_at) VALUES (?,?,?,?,?,{NOW},{NOW})"),
            (name, url, cat, desc, notes),
        ).map_err(e)?;
    }
    conn.execute("INSERT INTO settings (key,value) VALUES ('seeded','1')", []).map_err(e)?;
    Ok(())
}

// ---------- helpers ----------

fn table(name: &str) -> Res<&'static str> {
    TABLES.iter().copied().find(|t| *t == name).ok_or_else(|| format!("unknown table: {name}"))
}

fn columns(conn: &Connection, table: &str) -> Res<Vec<String>> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})")).map_err(e)?;
    let cols = stmt.query_map([], |r| r.get::<_, String>(1)).map_err(e)?.collect::<Result<Vec<_>, _>>().map_err(e)?;
    Ok(cols)
}

fn to_sql(v: &Value) -> Sql {
    match v {
        Value::Null => Sql::Null,
        Value::Bool(b) => Sql::Integer(*b as i64),
        Value::Number(n) => n.as_i64().map(Sql::Integer).unwrap_or_else(|| Sql::Real(n.as_f64().unwrap_or(0.0))),
        Value::String(s) => Sql::Text(s.clone()),
        other => Sql::Text(other.to_string()),
    }
}

pub fn query(conn: &Connection, sql: &str, params: Vec<Sql>) -> Res<Vec<Row>> {
    let mut stmt = conn.prepare(sql).map_err(e)?;
    let names: Vec<String> = stmt.column_names().map(|s| s.to_string()).collect();
    let rows = stmt
        .query_map(params_from_iter(params), |r| {
            let mut m = Map::new();
            for (i, n) in names.iter().enumerate() {
                let v = match r.get_ref(i)? {
                    ValueRef::Null | ValueRef::Blob(_) => Value::Null,
                    ValueRef::Integer(x) => Value::from(x),
                    ValueRef::Real(x) => Value::from(x),
                    ValueRef::Text(t) => Value::from(String::from_utf8_lossy(t).to_string()),
                };
                m.insert(n.clone(), v);
            }
            Ok(m)
        })
        .map_err(e)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(e)?;
    Ok(rows)
}

fn get_row(conn: &Connection, table: &str, id: i64) -> Res<Row> {
    query(conn, &format!("SELECT * FROM {table} WHERE id=?"), vec![Sql::Integer(id)])?
        .into_iter().next().ok_or_else(|| "row not found".into())
}

/// Writing to anything that belongs to a project counts as "the project was modified".
fn bump_project(conn: &Connection, table: &str, project_id: Option<i64>) -> Res<()> {
    if table == "projects" { return Ok(()); }
    if let Some(pid) = project_id {
        conn.execute(&format!("UPDATE projects SET updated_at={NOW} WHERE id=?"), [pid]).map_err(e)?;
    }
    Ok(())
}

fn project_id_of(conn: &Connection, table: &str, id: i64) -> Option<i64> {
    conn.query_row(&format!("SELECT project_id FROM {table} WHERE id=?"), [id], |r| r.get::<_, Option<i64>>(0))
        .ok().flatten()
}

// ---------- generic CRUD ----------

pub fn list(conn: &Connection, tbl: &str, filter: Option<Row>, order: Option<Vec<String>>) -> Res<Vec<Row>> {
    let tbl = table(tbl)?;
    let cols = columns(conn, tbl)?;
    let mut sql = format!("SELECT * FROM {tbl}");
    let mut params = vec![];
    if let Some(f) = filter.filter(|f| !f.is_empty()) {
        let mut parts = vec![];
        for (k, v) in f {
            if !cols.contains(&k) { return Err(format!("unknown column: {k}")); }
            if v.is_null() { parts.push(format!("{k} IS NULL")); } else { parts.push(format!("{k}=?")); params.push(to_sql(&v)); }
        }
        sql += &format!(" WHERE {}", parts.join(" AND "));
    }
    // order entries look like "position" or "-created_at" (descending)
    let order = order.unwrap_or_default();
    if !order.is_empty() {
        let mut parts = vec![];
        for o in order {
            let (col, dir) = o.strip_prefix('-').map(|c| (c, "DESC")).unwrap_or((o.as_str(), "ASC"));
            if !cols.iter().any(|c| c == col) { return Err(format!("unknown column: {col}")); }
            parts.push(format!("{col} {dir}"));
        }
        sql += &format!(" ORDER BY {}", parts.join(", "));
    }
    query(conn, &sql, params)
}

pub fn insert(conn: &Connection, tbl: &str, values: Row) -> Res<Row> {
    let tbl = table(tbl)?;
    let cols = columns(conn, tbl)?;
    let mut names = vec![];
    let mut exprs = vec![];
    let mut params = vec![];
    for (k, v) in &values {
        if k == "id" { continue; }
        if !cols.contains(k) { return Err(format!("unknown column: {k}")); }
        names.push(k.clone()); exprs.push("?".to_string()); params.push(to_sql(v));
    }
    for ts in ["created_at", "updated_at"] {
        if cols.iter().any(|c| c == ts) && !values.contains_key(ts) {
            names.push(ts.into()); exprs.push(NOW.into());
        }
    }
    let sql = format!("INSERT INTO {tbl} ({}) VALUES ({})", names.join(","), exprs.join(","));
    conn.execute(&sql, params_from_iter(params)).map_err(e)?;
    let id = conn.last_insert_rowid();
    let row = get_row(conn, tbl, id)?;
    bump_project(conn, tbl, row.get("project_id").and_then(|v| v.as_i64()))?;
    Ok(row)
}

pub fn update(conn: &Connection, tbl: &str, id: i64, values: Row) -> Res<Row> {
    let tbl = table(tbl)?;
    let cols = columns(conn, tbl)?;
    let mut sets = vec![];
    let mut params = vec![];
    for (k, v) in &values {
        if k == "id" { continue; }
        if !cols.contains(k) { return Err(format!("unknown column: {k}")); }
        sets.push(format!("{k}=?")); params.push(to_sql(v));
    }
    if cols.iter().any(|c| c == "updated_at") && !values.contains_key("updated_at") {
        sets.push(format!("updated_at={NOW}"));
    }
    if sets.is_empty() { return get_row(conn, tbl, id); }
    params.push(Sql::Integer(id));
    conn.execute(&format!("UPDATE {tbl} SET {} WHERE id=?", sets.join(",")), params_from_iter(params)).map_err(e)?;
    let row = get_row(conn, tbl, id)?;
    bump_project(conn, tbl, row.get("project_id").and_then(|v| v.as_i64()))?;
    Ok(row)
}

pub fn delete(conn: &Connection, tbl: &str, id: i64) -> Res<()> {
    let tbl = table(tbl)?;
    let pid = if columns(conn, tbl)?.iter().any(|c| c == "project_id") { project_id_of(conn, tbl, id) } else { None };
    conn.execute(&format!("DELETE FROM {tbl} WHERE id=?"), [id]).map_err(e)?;
    bump_project(conn, tbl, pid)
}

// ---------- project-specific ----------

pub fn list_projects(conn: &Connection) -> Res<Vec<Row>> {
    query(conn, "SELECT p.*,
        (SELECT COUNT(*) FROM process_items i WHERE i.project_id=p.id) AS steps_total,
        (SELECT COUNT(*) FROM process_items i WHERE i.project_id=p.id AND i.done=1) AS steps_done
        FROM projects p ORDER BY p.updated_at DESC", vec![])
}

/// Copy the reusable template (stages with project_id NULL) into a project.
pub fn apply_template(conn: &Connection, project_id: i64) -> Res<()> {
    let stages = list(conn, "process_stages", Some(Map::from_iter([("project_id".to_string(), Value::Null)])), Some(vec!["position".into()]))?;
    // append after any stages the project already has
    let offset: i64 = conn.query_row("SELECT COALESCE(MAX(position)+1,0) FROM process_stages WHERE project_id=?", [project_id], |r| r.get(0)).map_err(e)?;
    for st in stages {
        let sid = st["id"].as_i64().unwrap_or(0);
        let pos = st["position"].as_i64().unwrap_or(0) + offset;
        conn.execute("INSERT INTO process_stages (project_id,name,position) VALUES (?,?,?)", (project_id, st["name"].as_str().unwrap_or(""), pos)).map_err(e)?;
        let new_sid = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO process_items (stage_id,project_id,text,done,position)
             SELECT ?,?,text,0,position FROM process_items WHERE stage_id=? ORDER BY position",
            (new_sid, project_id, sid),
        ).map_err(e)?;
    }
    bump_project(conn, "process_items", Some(project_id))
}

pub fn create_project(conn: &mut Connection, values: Row, use_template: bool) -> Res<Row> {
    let tx = conn.transaction().map_err(e)?;
    let row = insert(&tx, "projects", values)?;
    if use_template { apply_template(&tx, row["id"].as_i64().unwrap_or(0))?; }
    tx.commit().map_err(e)?;
    Ok(row)
}

pub fn touch_project(conn: &Connection, id: i64) -> Res<()> {
    conn.execute(&format!("UPDATE projects SET last_opened_at={NOW} WHERE id=?"), [id]).map_err(e)?;
    Ok(())
}

pub fn get_setting(conn: &Connection, key: &str) -> Res<Option<String>> {
    Ok(conn.query_row("SELECT value FROM settings WHERE key=?", [key], |r| r.get(0)).ok())
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Res<()> {
    conn.execute("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, value)).map_err(e)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn mem() -> Connection {
        let c = Connection::open_in_memory().unwrap();
        c.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        migrate(&c).unwrap();
        seed(&c).unwrap();
        c
    }
    fn row(v: Value) -> Row { v.as_object().unwrap().clone() }

    #[test]
    fn seeds_template_and_resources_once() {
        let c = mem();
        seed(&c).unwrap(); // second call must be a no-op
        let stages = list(&c, "process_stages", Some(row(json!({"project_id": null}))), Some(vec!["position".into()])).unwrap();
        assert_eq!(stages.len(), 6);
        assert_eq!(stages[0]["name"], "Discovery");
        assert_eq!(list(&c, "process_items", Some(row(json!({"project_id": null}))), None).unwrap().len(), 24);
        assert_eq!(list(&c, "resources", None, None).unwrap().len(), schema::STARTER_RESOURCES.len());
    }

    #[test]
    fn create_project_copies_template_independently() {
        let mut c = mem();
        let p = create_project(&mut c, row(json!({"name": "Site", "category": "UX/UI"})), true).unwrap();
        let pid = p["id"].as_i64().unwrap();
        let items = list(&c, "process_items", Some(row(json!({"project_id": pid}))), None).unwrap();
        assert_eq!(items.len(), 24);
        // editing the project's copy must not touch the template, and vice versa
        update(&c, "process_items", items[0]["id"].as_i64().unwrap(), row(json!({"done": true, "text": "Changed"}))).unwrap();
        let tmpl = list(&c, "process_items", Some(row(json!({"project_id": null}))), Some(vec!["stage_id".into(), "position".into()])).unwrap();
        assert!(tmpl.iter().all(|i| i["done"] == 0 && i["text"] != "Changed"));
        let lp = list_projects(&c).unwrap();
        assert_eq!((lp[0]["steps_total"].as_i64(), lp[0]["steps_done"].as_i64()), (Some(24), Some(1)));
        // without template
        let p2 = create_project(&mut c, row(json!({"name": "Bare"})), false).unwrap();
        assert!(list(&c, "process_items", Some(row(json!({"project_id": p2["id"]}))), None).unwrap().is_empty());
    }

    #[test]
    fn child_writes_bump_project_modified_and_cascade_on_delete() {
        let c = mem();
        let p = insert(&c, "projects", row(json!({"name": "A", "created_at": "2000-01-01T00:00:00Z", "updated_at": "2000-01-01T00:00:00Z"}))).unwrap();
        let pid = p["id"].as_i64().unwrap();
        insert(&c, "decisions", row(json!({"project_id": pid, "title": "t"}))).unwrap();
        let after = list(&c, "projects", Some(row(json!({"id": pid}))), None).unwrap();
        assert_ne!(after[0]["updated_at"], "2000-01-01T00:00:00Z");
        touch_project(&c, pid).unwrap();
        delete(&c, "projects", pid).unwrap();
        assert!(list(&c, "decisions", None, None).unwrap().is_empty());
    }

    #[test]
    fn rejects_unknown_tables_and_columns() {
        let c = mem();
        assert!(list(&c, "sqlite_master", None, None).is_err());
        assert!(list(&c, "notes", Some(row(json!({"1=1; --": 1}))), None).is_err());
        assert!(list(&c, "notes", None, Some(vec!["id; DROP TABLE notes".into()])).is_err());
        assert!(insert(&c, "notes", row(json!({"nope": 1}))).is_err());
        assert!(update(&c, "notes", 1, row(json!({"x y": 1}))).is_err());
    }

    #[test]
    fn notes_ideas_settings_roundtrip() {
        let c = mem();
        let n = insert(&c, "notes", row(json!({"title": "T", "body": "B"}))).unwrap();
        let n2 = update(&c, "notes", n["id"].as_i64().unwrap(), row(json!({"pinned": true, "body": "B2"}))).unwrap();
        assert_eq!((n2["pinned"].as_i64(), n2["body"].as_str()), (Some(1), Some("B2")));
        insert(&c, "ideas", row(json!({"title": "I", "image": "data:image/png;base64,AAA"}))).unwrap();
        set_setting(&c, "quick_notes", "a").unwrap();
        set_setting(&c, "quick_notes", "b").unwrap();
        assert_eq!(get_setting(&c, "quick_notes").unwrap().as_deref(), Some("b"));
    }
}
