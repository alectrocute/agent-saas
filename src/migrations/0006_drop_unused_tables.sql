-- Recreate webhook_routes without FK to users so we can drop users
CREATE TABLE IF NOT EXISTS webhook_routes_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  identifier TEXT NOT NULL,
  user_id TEXT NOT NULL,
  UNIQUE(channel, identifier)
);
INSERT INTO webhook_routes_new SELECT id, channel, identifier, user_id FROM webhook_routes;
DROP TABLE webhook_routes;
ALTER TABLE webhook_routes_new RENAME TO webhook_routes;
CREATE INDEX IF NOT EXISTS idx_webhook_routes_lookup ON webhook_routes(channel, identifier);

-- Drop unused tables
DROP TABLE IF EXISTS agent_configs;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS users;
