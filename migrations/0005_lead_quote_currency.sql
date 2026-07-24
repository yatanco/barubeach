ALTER TABLE leads ADD COLUMN quote_currency TEXT NOT NULL DEFAULT 'USD' CHECK (quote_currency IN ('USD', 'COP'));
