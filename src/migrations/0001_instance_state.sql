-- Stub instance state for single-tenant (no Container/DO yet)
CREATE TABLE IF NOT EXISTS instance_state (
  user_id TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('stopped', 'starting', 'running')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
