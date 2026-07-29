-- Three CHECK-constrained schema changes, each requiring a full table rebuild
-- since SQLite has no ALTER TABLE ... ALTER COLUMN / DROP CONSTRAINT. All three
-- preserve existing rows exactly (id values untouched, so existing FK references
-- from charges/payment_links/provider_payments to bookings.id, and from bookings
-- to leads.id, keep working).

-- 1. leads.status: add 'deposit_pending' (link generated, awaiting guest payment),
--    sitting between 'quoted' and 'deposit' (deposit collected) in the pipeline.
CREATE TABLE leads_new (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'quoted', 'deposit_pending', 'deposit', 'booked', 'completed', 'lost', 'spam')),
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
  raw_payload TEXT NOT NULL,
  transport_included INTEGER DEFAULT 0,
  food_included INTEGER DEFAULT 0,
  quote_accommodation REAL,
  quote_transport REAL,
  quote_food REAL,
  quote_total REAL,
  quote_deposit REAL,
  quote_saved_at TEXT,
  quote_currency TEXT NOT NULL DEFAULT 'USD' CHECK (quote_currency IN ('USD', 'COP'))
);

INSERT INTO leads_new (
  id, created_at, updated_at, status, source, language, experience_type,
  guest_name, whatsapp, email, date_from, date_to, adults, children,
  estimated_price, guest_intent, notes, page_url, raw_payload,
  transport_included, food_included, quote_accommodation, quote_transport,
  quote_food, quote_total, quote_deposit, quote_saved_at, quote_currency
)
SELECT
  id, created_at, updated_at, status, source, language, experience_type,
  guest_name, whatsapp, email, date_from, date_to, adults, children,
  estimated_price, guest_intent, notes, page_url, raw_payload,
  transport_included, food_included, quote_accommodation, quote_transport,
  quote_food, quote_total, quote_deposit, quote_saved_at, quote_currency
FROM leads;

DROP TABLE leads;
ALTER TABLE leads_new RENAME TO leads;

CREATE INDEX IF NOT EXISTS leads_status_created_idx ON leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_whatsapp_idx ON leads (whatsapp);

-- 2. bookings.channel: add 'other'. Also add commission_rate (Booking.com % — editable,
--    default 18) and airbnb_payout_cents (what actually lands in the account for Airbnb
--    stays, since Airbnb collects accommodation revenue directly rather than through
--    this CRM's charges/payments flow).
CREATE TABLE bookings_new (
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
  channel TEXT NOT NULL DEFAULT 'direct' CHECK (channel IN ('direct', 'airbnb', 'booking.com', 'other')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'hosthub_ical')),
  hosthub_notes TEXT,
  utm_source TEXT,
  self_reported_source TEXT,
  notes TEXT,
  cost_staff_cents INTEGER NOT NULL DEFAULT 0,
  cost_food_cents INTEGER NOT NULL DEFAULT 0,
  cost_transport_cents INTEGER NOT NULL DEFAULT 0,
  ota_commission_cents INTEGER NOT NULL DEFAULT 0,
  commission_rate REAL NOT NULL DEFAULT 18,
  airbnb_payout_cents INTEGER NOT NULL DEFAULT 0
);

INSERT INTO bookings_new (
  id, created_at, updated_at, lead_id, reservation_id, guest_name, guest_phone,
  date_from, date_to, nights, adults, children, status, channel, source,
  hosthub_notes, utm_source, self_reported_source, notes,
  cost_staff_cents, cost_food_cents, cost_transport_cents, ota_commission_cents,
  commission_rate, airbnb_payout_cents
)
SELECT
  id, created_at, updated_at, lead_id, reservation_id, guest_name, guest_phone,
  date_from, date_to, nights, adults, children, status, channel, source,
  hosthub_notes, utm_source, self_reported_source, notes,
  cost_staff_cents, cost_food_cents, cost_transport_cents, ota_commission_cents,
  18, 0
FROM bookings;

DROP TABLE bookings;
ALTER TABLE bookings_new RENAME TO bookings;

CREATE INDEX IF NOT EXISTS bookings_dates_idx ON bookings (date_from, date_to);

-- 3. payment_links: booking_id becomes optional, lead_id added, so a link can be
--    generated for a lead's deposit before it's ever converted to a booking.
CREATE TABLE payment_links_new (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  charge_description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('bold', 'wompi')),
  link_id TEXT,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  created_at TEXT NOT NULL,
  expires_at TEXT,
  CHECK ((booking_id IS NOT NULL) OR (lead_id IS NOT NULL))
);

INSERT INTO payment_links_new (
  id, booking_id, lead_id, charge_description, amount_cents, provider, link_id, url, status, created_at, expires_at
)
SELECT id, booking_id, NULL, charge_description, amount_cents, provider, link_id, url, status, created_at, expires_at
FROM payment_links;

DROP TABLE payment_links;
ALTER TABLE payment_links_new RENAME TO payment_links;

CREATE INDEX IF NOT EXISTS payment_links_booking_idx ON payment_links (booking_id);
CREATE INDEX IF NOT EXISTS payment_links_lead_idx ON payment_links (lead_id);
