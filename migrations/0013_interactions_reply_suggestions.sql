-- Shared per-lead/booking interaction timeline (outgoing messages, audit
-- notes) plus the Generate Reply feature's suggestion log. Both are new
-- infrastructure — no prior "interactions" table existed before this.

CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  booking_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('outgoing', 'note')),
  message_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK ((lead_id IS NOT NULL) OR (booking_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS interactions_lead_idx ON interactions (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS interactions_booking_idx ON interactions (booking_id, created_at DESC);

-- One row per "Generate reply" click. generated_reply/rationale/warnings are
-- the model's output verbatim; edited_reply is filled in only if the operator
-- changed the text before marking it sent. sales_context is a JSON snapshot
-- of what was sent to the model, kept for later comparison/debugging.
CREATE TABLE IF NOT EXISTS reply_suggestions (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  sales_context TEXT NOT NULL,
  generated_reply TEXT NOT NULL,
  rationale TEXT NOT NULL,
  warnings TEXT NOT NULL DEFAULT '[]',
  edited_reply TEXT,
  sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reply_suggestions_lead_idx ON reply_suggestions (lead_id, created_at DESC);
