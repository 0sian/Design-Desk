# Design Desk

Personal desktop workspace for web/UX design: projects, a reusable design process, resource library, ideas and notes. Local-first, no accounts, no network needed.

**Stack:** Tauri 2 (Rust) · React + TypeScript + Vite · SQLite (`rusqlite`, bundled)

## Run

Prerequisites: Node, Rust, and Tauri's Linux deps (`webkit2gtk-4.1`).

    npm install
    npm run dev      # development window with hot reload
    npm run build    # release binary: src-tauri/target/release/design-desk
    cd src-tauri && cargo test   # database tests

## Layout

    src-tauri/src/schema.rs    tables, migrations, default process + starter resources
    src-tauri/src/db.rs        connection, migrations, generic CRUD (table/column whitelisted)
    src-tauri/src/commands.rs  Tauri commands exposed to the UI
    src/lib/                   api wrapper, router, hooks, helpers
    src/components/            shared UI (modal, autosave text, link list, process editor)
    src/pages/                 one file per section
    src/styles/tokens.css      all colours/spacing/type: start redesigns here

## Data

One SQLite file: `~/.local/share/dev.designdesk.app/design-desk.db` (Linux).
Back up or move the app by copying that file. Images are stored inside it.
