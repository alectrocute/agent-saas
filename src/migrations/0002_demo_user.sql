-- Single-tenant demo user (no auth)
INSERT OR IGNORE INTO users (id, email, name, google_id, created_at)
VALUES ('demo', 'demo@localhost', 'Demo User', 'demo', datetime('now'));
