-- Costs move from three flat per-booking buckets (staff/food/transport) to a
-- per-charge cost, so a cost can be attached to any revenue line (including
-- freeform "extra" lines) rather than only the three fixed categories.
-- Production has zero rows in `charges` and zero non-default values in the
-- three columns being dropped, so this is a clean cutover, not a backfill.
ALTER TABLE charges ADD COLUMN cost_cents INTEGER NOT NULL DEFAULT 0;

ALTER TABLE bookings DROP COLUMN cost_staff_cents;
ALTER TABLE bookings DROP COLUMN cost_food_cents;
ALTER TABLE bookings DROP COLUMN cost_transport_cents;
