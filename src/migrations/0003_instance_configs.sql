-- Multi-tenant instance configs (unauthenticated demo)
CREATE TABLE IF NOT EXISTS instance_configs (
  instance_id TEXT PRIMARY KEY,
  config_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_instance_configs_updated_at ON instance_configs(updated_at);

