-- Variable costs and OTA commission per booking, for contribution-margin reporting.
-- Stored in cents like every other money column in this schema (amount_cents, paid_cents).
ALTER TABLE bookings ADD COLUMN cost_staff_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN cost_food_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN cost_transport_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN ota_commission_cents INTEGER NOT NULL DEFAULT 0;
