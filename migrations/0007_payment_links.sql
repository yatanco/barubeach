-- Payment links (Bold/Wompi) generated for a booking, and outbound payments to
-- suppliers (boat captain, staff, etc). booking_id is TEXT to match bookings.id,
-- which is a crypto.randomUUID() string, not an autoincrement integer.
CREATE TABLE IF NOT EXISTS payment_links (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  charge_description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('bold', 'wompi')),
  link_id TEXT,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  created_at TEXT NOT NULL,
  expires_at TEXT
);

CREATE INDEX IF NOT EXISTS payment_links_booking_idx ON payment_links (booking_id);

CREATE TABLE IF NOT EXISTS provider_payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  service TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('nequi', 'transferencia', 'efectivo')),
  paid_at TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS provider_payments_booking_idx ON provider_payments (booking_id);
