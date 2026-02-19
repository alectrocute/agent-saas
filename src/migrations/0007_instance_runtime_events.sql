-- Track instance start/stop for billing. Pair start with next stop (or now) to compute run time.
CREATE TABLE IF NOT EXISTS instance_runtime_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instance_id TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('start', 'stop')),
  at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_instance_runtime_events_lookup ON instance_runtime_events(instance_id, at);
