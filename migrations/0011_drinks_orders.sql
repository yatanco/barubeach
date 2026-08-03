-- Guest-facing drinks ordering flow (/drinks, /es/drinks). Each order is a
-- lightweight WhatsApp-handoff record, not part of the leads/bookings/charges/
-- payments pipeline — booking_id is a loose text reference (not a FK) so an
-- order can be logged even if the guest reaches /drinks without a ?booking=
-- param (walk-in / no booking linked yet).
CREATE TABLE IF NOT EXISTS drinks_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id TEXT,
  guest_name TEXT NOT NULL,
  items TEXT NOT NULL,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  source TEXT DEFAULT 'drinks_page'
);

CREATE INDEX IF NOT EXISTS drinks_orders_booking_idx ON drinks_orders (booking_id);
CREATE INDEX IF NOT EXISTS drinks_orders_status_created_idx ON drinks_orders (status, created_at DESC);
