ALTER TABLE leads ADD COLUMN transport_included INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN food_included INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN quote_accommodation REAL;
ALTER TABLE leads ADD COLUMN quote_transport REAL;
ALTER TABLE leads ADD COLUMN quote_food REAL;
ALTER TABLE leads ADD COLUMN quote_total REAL;
ALTER TABLE leads ADD COLUMN quote_deposit REAL;
ALTER TABLE leads ADD COLUMN quote_saved_at TEXT;
