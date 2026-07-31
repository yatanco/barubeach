-- Unifies leads and bookings onto one status pipeline and adds the flat
-- food/transport/accommodation fields the simplified mobile UI needs.
-- Numbered 0010, not 0009 — 0009 (charges.cost_cents) is already applied.
--
-- All "_amount" columns added below store CENTS, consistent with every other
-- money column in this schema and with the money() helper — despite the
-- column names not carrying a "_cents" suffix.
--
-- Real production data exists in charges/payments (an accommodation charge,
-- a food charge, a transport charge, two payments against them), so this is a
-- careful rebuild, not a fresh schema: old status values are mapped onto the
-- new set, and existing food/transport charge amounts are copied forward into
-- the new flat columns so nothing already recorded disappears from the UI.
-- The old charge rows themselves are NOT deleted — the two existing payments
-- still reference them by charge_id, and deleting would orphan that payment
-- history. They just stop being the source of truth for food/transport going
-- forward (accommodation stays charge-based; see comment on bookings below).
--
-- FK note: leads/bookings/charges/payments previously had REFERENCES ...
-- ON DELETE CASCADE/SET NULL between them. Those clauses are dropped here.
-- SQLite performs an implicit cascading DELETE when a table referenced by a
-- live FK is dropped, and — because FK resolution is by table name, not by a
-- frozen reference to a specific table instance — that cascade can fire
-- against a _new replacement table that merely happens to share the target's
-- old name at drop time, not just the real old table. That's exactly what
-- happened testing this locally: dropping the old bookings table emptied the
-- freshly-populated charges_new (whose booking_id column referenced
-- "bookings" by name) before it was ever renamed into place. With four
-- tables all being rebuilt at once, no drop/rename ordering avoids this
-- ambiguity, and D1 does not appear to honor `PRAGMA foreign_keys = OFF`
-- as a workaround. Nothing in the application relies on cascade-delete
-- behavior (there's no "delete booking/lead" feature), so removing the FK
-- constraints trades a bit of self-documentation for a rebuild that can't
-- silently destroy data — every _new table is still fully populated from
-- its old counterpart before anything is dropped, as defense in depth.
--
-- payment_links/provider_payments (both empty in production, fully removed
-- below in favor of the evergreen Bold link + a plain payments list) are
-- dropped FIRST, before any of leads/bookings/charges/payments are touched.
-- They still carry live `REFERENCES bookings(id) ON DELETE CASCADE` and
-- `REFERENCES leads(id) ON DELETE CASCADE` clauses from migrations
-- 0007/0008. Dropping them last (the original ordering) broke: DROP TABLE
-- leads failed with "no such table: main.bookings", even though bookings
-- had already been dropped cleanly by an earlier statement in the same
-- batch. Root cause, confirmed by bisection — SQLite recompiles ALL of a
-- table's foreign-key-action triggers (not just the one for the column
-- actually being cascaded) when planning the implicit DELETE from a DROP
-- TABLE. payment_links has two outgoing FKs (booking_id and lead_id), so
-- dropping leads forced SQLite to also resolve payment_links' dangling
-- booking_id -> bookings clause, and bookings no longer existed by then.
-- Getting payment_links/provider_payments out of the way before bookings
-- and leads are ever dropped sidesteps this entirely.
DROP TABLE IF EXISTS payment_links;
DROP TABLE IF EXISTS provider_payments;

CREATE TABLE leads_new (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'quoted', 'deposit_requested', 'deposit_paid',
    'confirmed', 'upsell_pending', 'upsell_confirmed',
    'in_house', 'balance_requested', 'completed',
    'lost', 'cancelled'
  )),
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
  quote_currency TEXT NOT NULL DEFAULT 'USD' CHECK (quote_currency IN ('USD', 'COP')),
  accommodation_amount INTEGER NOT NULL DEFAULT 0,
  food_amount INTEGER NOT NULL DEFAULT 0,
  food_confirmed INTEGER NOT NULL DEFAULT 0,
  transport_amount INTEGER NOT NULL DEFAULT 0,
  transport_confirmed INTEGER NOT NULL DEFAULT 0
);

INSERT INTO leads_new (
  id, created_at, updated_at, status, source, language, experience_type,
  guest_name, whatsapp, email, date_from, date_to, adults, children,
  estimated_price, guest_intent, notes, page_url, raw_payload,
  transport_included, food_included, quote_accommodation, quote_transport,
  quote_food, quote_total, quote_deposit, quote_saved_at, quote_currency
)
SELECT
  id, created_at, updated_at,
  CASE status
    WHEN 'deposit_pending' THEN 'deposit_requested'
    WHEN 'deposit' THEN 'deposit_paid'
    WHEN 'booked' THEN 'confirmed'
    WHEN 'spam' THEN 'lost'
    ELSE status
  END,
  source, language, experience_type,
  guest_name, whatsapp, email, date_from, date_to, adults, children,
  estimated_price, guest_intent, notes, page_url, raw_payload,
  transport_included, food_included, quote_accommodation, quote_transport,
  quote_food, quote_total, quote_deposit, quote_saved_at, quote_currency
FROM leads;

-- bookings: unified status set (plus legacy 'checked_in', still written
-- directly by hosthub-sync.ts, which this task does not touch) + new flat
-- food/transport fields + variable-cost columns (re-added — 0009 moved cost
-- tracking onto charges.cost_cents per-charge, but the simplified Section 8
-- UI needs three flat operator-entered cost fields again, same as before 0009).
-- Accommodation is NOT added as a flat column here: bookings already track it
-- via a charges row (category='accommodation'), which stays the source of
-- truth for bookings — only leads get a flat accommodation_amount, since a
-- lead has no charges relationship at all before it's linked to a reservation.
CREATE TABLE bookings_new (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  lead_id TEXT UNIQUE,
  reservation_id TEXT UNIQUE,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  date_from TEXT NOT NULL,
  date_to TEXT NOT NULL,
  nights INTEGER NOT NULL DEFAULT 0,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN (
    'new', 'quoted', 'deposit_requested', 'deposit_paid',
    'confirmed', 'upsell_pending', 'upsell_confirmed',
    'in_house', 'checked_in', 'balance_requested', 'completed',
    'lost', 'cancelled'
  )),
  channel TEXT NOT NULL DEFAULT 'direct' CHECK (channel IN ('direct', 'airbnb', 'booking.com', 'other')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'hosthub_ical')),
  hosthub_notes TEXT,
  utm_source TEXT,
  self_reported_source TEXT,
  notes TEXT,
  ota_commission_cents INTEGER NOT NULL DEFAULT 0,
  commission_rate REAL NOT NULL DEFAULT 18,
  airbnb_payout_cents INTEGER NOT NULL DEFAULT 0,
  food_amount INTEGER NOT NULL DEFAULT 0,
  food_confirmed INTEGER NOT NULL DEFAULT 0,
  transport_amount INTEGER NOT NULL DEFAULT 0,
  transport_confirmed INTEGER NOT NULL DEFAULT 0,
  cost_staff_cents INTEGER NOT NULL DEFAULT 0,
  cost_food_cents INTEGER NOT NULL DEFAULT 0,
  cost_transport_cents INTEGER NOT NULL DEFAULT 0
);

INSERT INTO bookings_new (
  id, created_at, updated_at, lead_id, reservation_id, guest_name, guest_phone,
  date_from, date_to, nights, adults, children, status, channel, source,
  hosthub_notes, utm_source, self_reported_source, notes,
  ota_commission_cents, commission_rate, airbnb_payout_cents
)
SELECT
  id, created_at, updated_at, lead_id, reservation_id, guest_name, guest_phone,
  date_from, date_to, nights, adults, children,
  CASE status
    WHEN 'active' THEN 'confirmed'
    WHEN 'CONFIRMED' THEN 'confirmed'
    WHEN 'COMPLETED' THEN 'completed'
    WHEN 'CANCELLED' THEN 'cancelled'
    ELSE status
  END,
  channel, source, hosthub_notes, utm_source, self_reported_source, notes,
  ota_commission_cents, commission_rate, airbnb_payout_cents
FROM bookings;

-- charges: booking_id becomes optional and lead_id is added, so a lead can
-- anchor its own "collection" charge for deposit payments before it's ever
-- converted into a booking (same nullable-either-side pattern already used
-- for payment_links in migration 0008).
CREATE TABLE charges_new (
  id TEXT PRIMARY KEY,
  booking_id TEXT,
  lead_id TEXT,
  created_at TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('accommodation', 'transport', 'food', 'boat', 'extra')),
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'COP',
  due_date TEXT,
  operational_status TEXT NOT NULL DEFAULT 'not_required' CHECK (operational_status IN ('not_required', 'pending', 'confirmed', 'completed')),
  notes TEXT,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  CHECK ((booking_id IS NOT NULL) OR (lead_id IS NOT NULL))
);

INSERT INTO charges_new (
  id, booking_id, lead_id, created_at, category, description, amount_cents, currency, due_date, operational_status, notes, cost_cents
)
SELECT id, booking_id, NULL, created_at, category, description, amount_cents, currency, due_date, operational_status, notes, cost_cents
FROM charges;

-- payments: no schema change at all, but rebuilt through the same
-- create-and-copy-first pattern since charges (its former FK parent) is
-- also being rebuilt and dropped in this migration.
CREATE TABLE payments_new (
  id TEXT PRIMARY KEY,
  charge_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  paid_at TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  method TEXT,
  reference TEXT,
  notes TEXT
);

INSERT INTO payments_new (id, charge_id, created_at, paid_at, amount_cents, method, reference, notes)
SELECT id, charge_id, created_at, paid_at, amount_cents, method, reference, notes
FROM payments;

-- Now that every _new table has a full copy of its data, drop the old
-- tables (child-to-parent order, though it no longer matters for data
-- safety) and rename the replacements into place.
DROP TABLE payments;
DROP TABLE charges;
DROP TABLE bookings;
DROP TABLE leads;

ALTER TABLE leads_new RENAME TO leads;
ALTER TABLE bookings_new RENAME TO bookings;
ALTER TABLE charges_new RENAME TO charges;
ALTER TABLE payments_new RENAME TO payments;

CREATE INDEX IF NOT EXISTS leads_status_created_idx ON leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_whatsapp_idx ON leads (whatsapp);
CREATE INDEX IF NOT EXISTS bookings_dates_idx ON bookings (date_from, date_to);
CREATE INDEX IF NOT EXISTS charges_booking_idx ON charges (booking_id);
CREATE INDEX IF NOT EXISTS charges_lead_idx ON charges (lead_id);
CREATE INDEX IF NOT EXISTS payments_charge_idx ON payments (charge_id);

-- Carry forward existing food/transport charge amounts (and their costs) onto
-- the new flat booking columns, so previously-recorded revenue doesn't
-- vanish from the simplified UI. The old charge rows are left in place
-- untouched — the two existing payments still reference them by charge_id.
UPDATE bookings SET
  food_amount = COALESCE((SELECT c.amount_cents FROM charges c WHERE c.booking_id = bookings.id AND c.category = 'food' ORDER BY c.created_at LIMIT 1), 0),
  food_confirmed = CASE WHEN EXISTS (SELECT 1 FROM charges c WHERE c.booking_id = bookings.id AND c.category = 'food' AND c.amount_cents > 0) THEN 1 ELSE 0 END,
  cost_food_cents = COALESCE((SELECT c.cost_cents FROM charges c WHERE c.booking_id = bookings.id AND c.category = 'food' ORDER BY c.created_at LIMIT 1), 0),
  transport_amount = COALESCE((SELECT c.amount_cents FROM charges c WHERE c.booking_id = bookings.id AND c.category = 'transport' ORDER BY c.created_at LIMIT 1), 0),
  transport_confirmed = CASE WHEN EXISTS (SELECT 1 FROM charges c WHERE c.booking_id = bookings.id AND c.category = 'transport' AND c.amount_cents > 0) THEN 1 ELSE 0 END,
  cost_transport_cents = COALESCE((SELECT c.cost_cents FROM charges c WHERE c.booking_id = bookings.id AND c.category = 'transport' ORDER BY c.created_at LIMIT 1), 0)
WHERE EXISTS (SELECT 1 FROM charges c WHERE c.booking_id = bookings.id AND c.category IN ('food', 'transport'));
