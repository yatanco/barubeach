CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  synced_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'hosthub_ical',
  processed INTEGER DEFAULT 0,
  inserted INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  error TEXT,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS sync_log_synced_idx ON sync_log (synced_at DESC);
