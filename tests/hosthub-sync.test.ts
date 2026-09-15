import test from 'node:test';
import assert from 'node:assert/strict';
import { nextStatusOnResync } from '../src/lib/hosthub-sync.ts';

test('nextStatusOnResync advances a still-confirmed booking through the date-derived ladder as before', () => {
  assert.equal(nextStatusOnResync('confirmed', '2026-09-18', '2026-09-20', '2026-09-10'), 'confirmed');
  assert.equal(nextStatusOnResync('confirmed', '2026-09-18', '2026-09-20', '2026-09-19'), 'checked_in');
  assert.equal(nextStatusOnResync('confirmed', '2026-09-18', '2026-09-20', '2026-09-25'), 'completed');
});

test('nextStatusOnResync preserves an operator-progressed status instead of resetting it to confirmed', () => {
  assert.equal(nextStatusOnResync('deposit_paid', '2026-12-28', '2027-01-03', '2026-09-07'), 'deposit_paid');
  assert.equal(nextStatusOnResync('upsell_pending', '2026-12-28', '2027-01-03', '2026-09-07'), 'upsell_pending');
  assert.equal(nextStatusOnResync('in_house', '2026-09-05', '2026-09-10', '2026-09-07'), 'in_house');
});

test('nextStatusOnResync still auto-completes a progressed booking once the stay has ended', () => {
  assert.equal(nextStatusOnResync('balance_requested', '2026-08-01', '2026-08-05', '2026-09-07'), 'completed');
});

test('nextStatusOnResync never resurrects a cancelled or lost booking', () => {
  assert.equal(nextStatusOnResync('cancelled', '2026-09-18', '2026-09-20', '2026-09-19'), 'cancelled');
  assert.equal(nextStatusOnResync('lost', '2026-01-01', '2026-01-05', '2026-09-07'), 'lost');
});
