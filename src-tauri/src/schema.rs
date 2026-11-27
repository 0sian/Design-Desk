//! SQLite schema + migrations. One file on disk (design-desk.db) holds everything,
//! so backing up the app is copying that file.

pub const MIGRATIONS: &[&str] = &[
    // v1
    "
    CREATE TABLE projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Planning',
        category TEXT NOT NULL DEFAULT 'Web Design',
        cover TEXT,
        hidden_sections TEXT NOT NULL DEFAULT '',
        brief TEXT NOT NULL DEFAULT '',
        problem TEXT NOT NULL DEFAULT '',
        audience TEXT NOT NULL DEFAULT '',
        goals TEXT NOT NULL DEFAULT '',
        research_notes TEXT NOT NULL DEFAULT '',
        competitor_analysis TEXT NOT NULL DEFAULT '',
        reflect_well TEXT NOT NULL DEFAULT '',
        reflect_not_well TEXT NOT NULL DEFAULT '',
        reflect_change TEXT NOT NULL DEFAULT '',
        reflect_learned TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_opened_at TEXT
    );

    -- kind: 'research' | 'asset'
    CREATE TABLE project_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
    );

    -- project_id NULL = the reusable template
    CREATE TABLE process_stages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE process_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stage_id INTEGER NOT NULL REFERENCES process_stages(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT '',
        area TEXT NOT NULL DEFAULT 'Other',
        decision TEXT NOT NULL DEFAULT '',
        rationale TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '',
        starred INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE ideas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL DEFAULT '',
        image TEXT,
        tags TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '',
        pinned INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    ",
];

/// (stage, items) used to seed the reusable template on first run.
pub const DEFAULT_PROCESS: &[(&str, &[&str])] = &[
    ("Discovery", &["Define the problem", "Identify the target audience", "Establish project goals", "Understand the requirements"]),
    ("Research", &["Competitor analysis", "Gather inspiration", "Identify UX opportunities", "Document findings"]),
    ("Structure", &["Define user journeys", "Plan information architecture", "Sketch wireframes", "Map key interactions"]),
    ("Visual Design", &["Establish visual direction", "Define typography and colours", "Create components", "Design key screens"]),
    ("Prototyping and Testing", &["Create interactive prototypes", "Test usability", "Identify friction points", "Refine the design"]),
    ("Delivery", &["Finalise designs", "Document design decisions", "Review accessibility", "Reflect on the finished project"]),
];

/// (name, url, category, description, notes) — starter library, all editable/deletable.
pub const STARTER_RESOURCES: &[(&str, &str, &str, &str, &str)] = &[
    ("Laws of UX", "https://lawsofux.com", "UX principles and learning", "Collection of UX heuristics and psychology principles.", "Quick way to put a name to why something feels right or wrong."),
    ("10 Usability Heuristics", "https://www.nngroup.com/articles/ten-usability-heuristics/", "UX principles and learning", "Nielsen Norman Group's classic heuristic list.", "Use as a checklist when reviewing a design."),
    ("Mobbin", "https://mobbin.com", "Design inspiration", "Screenshots of real apps and flows.", ""),
    ("UI Patterns", "https://ui-patterns.com", "UI patterns and components", "Catalogue of common interface patterns.", ""),
    ("Google Fonts", "https://fonts.google.com", "Typography", "Free, open-source font library.", ""),
    ("Coolors", "https://coolors.co", "Colour palettes", "Palette generator and explorer.", ""),
    ("Figma", "https://www.figma.com", "Tools and software", "Interface design and prototyping.", ""),
    ("Smashing Magazine", "https://www.smashingmagazine.com", "Articles and tutorials", "Long-form articles on design and front-end.", ""),
    ("WebAIM Contrast Checker", "https://webaim.org/resources/contrastchecker/", "Accessibility", "Check text/background colour contrast against WCAG.", "Run every palette through this before committing to it."),
    ("The A11Y Project", "https://www.a11yproject.com", "Accessibility", "Community-driven accessibility resources and checklist.", ""),
];
