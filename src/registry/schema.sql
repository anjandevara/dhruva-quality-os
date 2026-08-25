CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    repository_path TEXT NOT NULL,
    active_environment TEXT NOT NULL DEFAULT 'qa',
    s3_bucket_prefix TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_environments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    environment_name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS test_runs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    environment TEXT NOT NULL,
    run_status TEXT NOT NULL,
    total_tests INTEGER NOT NULL DEFAULT 0,
    passed_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    flaky_count INTEGER NOT NULL DEFAULT 0,
    healed_count INTEGER NOT NULL DEFAULT 0,
    duration_seconds REAL NOT NULL DEFAULT 0.0,
    execution_hash TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
