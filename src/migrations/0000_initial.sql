-- users: id, email, name, google_id, created_at
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  google_id TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- subscriptions: user_id, provider, external_id, plan_id, status, current_period_end
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL CHECK (provider IN ('lemonsqueezy', 'stripe')),
  external_id TEXT NOT NULL,
  plan_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_end TEXT,
  UNIQUE(user_id, provider)
);

-- agent_configs: user_id (unique), config_json, updated_at
CREATE TABLE IF NOT EXISTS agent_configs (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  config_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- webhook_routes: channel, identifier, user_id — route incoming webhooks to user
CREATE TABLE IF NOT EXISTS webhook_routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  identifier TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  UNIQUE(channel, identifier)
);

CREATE INDEX IF NOT EXISTS idx_webhook_routes_lookup ON webhook_routes(channel, identifier);
