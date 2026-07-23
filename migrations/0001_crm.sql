PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'quoted', 'deposit', 'booked', 'completed', 'lost', 'spam')),
  source TEXT NOT NULL,
  language TEXT NOT NULL,
  experience_type TEXT NOT NULL,
  guest_name TEXT,
  whatsapp TEXT,
  email TEXT,
  date_from TEXT,
  date_to TEXT,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  estimated_price TEXT,
  guest_intent TEXT CHECK (guest_intent IN ('family_vacation', 'birthday', 'anniversary', 'work_retreat', 'friends', 'relaxation', 'day_trip', 'wedding', 'other')),
  notes TEXT,
  page_url TEXT,
  raw_payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS leads_status_created_idx ON leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_whatsapp_idx ON leads (whatsapp);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  lead_id TEXT UNIQUE REFERENCES leads(id) ON DELETE SET NULL,
  reservation_id TEXT UNIQUE,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  date_from TEXT NOT NULL,
  date_to TEXT NOT NULL,
  nights INTEGER NOT NULL DEFAULT 0,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'checked_in', 'completed', 'cancelled')),
  channel TEXT NOT NULL DEFAULT 'direct' CHECK (channel IN ('direct', 'airbnb', 'booking.com')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'hosthub_ical')),
  hosthub_notes TEXT,
  utm_source TEXT,
  self_reported_source TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS bookings_dates_idx ON bookings (date_from, date_to);

CREATE TABLE IF NOT EXISTS charges (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('accommodation', 'transport', 'food', 'boat', 'extra')),
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'COP',
  due_date TEXT,
  operational_status TEXT NOT NULL DEFAULT 'not_required' CHECK (operational_status IN ('not_required', 'pending', 'confirmed', 'completed')),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS charges_booking_idx ON charges (booking_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  charge_id TEXT NOT NULL REFERENCES charges(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  paid_at TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  method TEXT,
  reference TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS payments_charge_idx ON payments (charge_id);

