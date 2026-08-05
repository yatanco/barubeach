-- Adds a "replied" status between new and quoted in the lead-only pipeline
-- (LEAD_PIPELINE in src/lib/crm.ts) plus columns for a manual follow-up
-- cadence: last_contact_date (set when a lead moves new -> replied, or on
-- any later logged follow-up), next_followup_date (a suggested Day 3 / Day 7
-- follow-up date), and followup_count (how many follow-ups have been logged
-- since the lead was first replied to, used to pick Day 3 vs Day 7).
--
-- SQLite can't ALTER a CHECK constraint in place, so the status column needs
-- the same create-copy-drop-rename rebuild migration 0010 used. Scoped to
-- leads only — bookings.status keeps its own separate CHECK constraint and
-- is not touched here, since 'replied' is a lead-only concept (see
-- LEAD_PIPELINE vs DIRECT_PIPELINE in crm.ts). Migration 0010 already
-- removed all FK constraints between these tables, so rebuilding leads
-- alone is safe — no cascading deletes onto bookings/charges/payments.
CREATE TABLE leads_new (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'replied', 'quoted', 'deposit_requested', 'deposit_paid',
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
  transport_confirmed INTEGER NOT NULL DEFAULT 0,
  last_contact_date TEXT,
  next_followup_date TEXT,
  followup_count INTEGER NOT NULL DEFAULT 0
);

INSERT INTO leads_new (
  id, created_at, updated_at, status, source, language, experience_type,
  guest_name, whatsapp, email, date_from, date_to, adults, children,
  estimated_price, guest_intent, notes, page_url, raw_payload,
  transport_included, food_included, quote_accommodation, quote_transport,
  quote_food, quote_total, quote_deposit, quote_saved_at, quote_currency,
  accommodation_amount, food_amount, food_confirmed, transport_amount, transport_confirmed
)
SELECT
  id, created_at, updated_at, status, source, language, experience_type,
  guest_name, whatsapp, email, date_from, date_to, adults, children,
  estimated_price, guest_intent, notes, page_url, raw_payload,
  transport_included, food_included, quote_accommodation, quote_transport,
  quote_food, quote_total, quote_deposit, quote_saved_at, quote_currency,
  accommodation_amount, food_amount, food_confirmed, transport_amount, transport_confirmed
FROM leads;

DROP TABLE leads;
ALTER TABLE leads_new RENAME TO leads;

CREATE INDEX IF NOT EXISTS leads_status_created_idx ON leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_whatsapp_idx ON leads (whatsapp);
CREATE INDEX IF NOT EXISTS leads_next_followup_idx ON leads (next_followup_date);
