import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findConflicts, rangeCoversNight, ACTIVE_BOOKING_FILTER_SQL, ACTIVE_UNLINKED_LEAD_FILTER_SQL,
  HARD_CONFLICT_CANDIDATES_SQL, SOFT_CONFLICT_CANDIDATES_SQL,
  type ConflictInfo,
} from '../src/lib/crm-availability.ts';

function candidate(overrides: Partial<ConflictInfo> = {}): ConflictInfo {
  return { id: 'c1', guestName: 'Test Guest', status: 'confirmed', dateFrom: '2026-09-18', dateTo: '2026-09-20', ...overrides };
}

test('rangeCoversNight treats the range as half-open: check-in night included, check-out night excluded', () => {
  assert.equal(rangeCoversNight('2026-09-18', '2026-09-20', '2026-09-18'), true);
  assert.equal(rangeCoversNight('2026-09-18', '2026-09-20', '2026-09-19'), true);
  assert.equal(rangeCoversNight('2026-09-18', '2026-09-20', '2026-09-20'), false);
  assert.equal(rangeCoversNight('2026-09-18', '2026-09-20', '2026-09-17'), false);
});

test('findConflicts excludes the record itself and ranges that only touch at the boundary', () => {
  const candidates = [candidate({ id: 'self' }), candidate({ id: 'touches-after', dateFrom: '2026-09-20', dateTo: '2026-09-22' })];
  const result = findConflicts(candidates, '2026-09-18', '2026-09-20', 'self');
  assert.deepEqual(result.map((c) => c.id), []);
});

test('findConflicts finds a genuine overlap', () => {
  const candidates = [candidate({ id: 'overlap', dateFrom: '2026-09-19', dateTo: '2026-09-21' })];
  const result = findConflicts(candidates, '2026-09-18', '2026-09-20', 'target');
  assert.deepEqual(result.map((c) => c.id), ['overlap']);
});

test('the dashboard candidate SQL and the calendar reuse the same active-status filter fragments', () => {
  assert.match(HARD_CONFLICT_CANDIDATES_SQL, /status NOT IN \('cancelled','lost'\)/);
  assert.equal(HARD_CONFLICT_CANDIDATES_SQL.includes(ACTIVE_BOOKING_FILTER_SQL), true);
  assert.equal(SOFT_CONFLICT_CANDIDATES_SQL.includes(ACTIVE_UNLINKED_LEAD_FILTER_SQL), true);
  assert.match(ACTIVE_UNLINKED_LEAD_FILTER_SQL, /status NOT IN \('lost','cancelled'\)/);
  assert.match(ACTIVE_UNLINKED_LEAD_FILTER_SQL, /NOT EXISTS \(SELECT 1 FROM bookings WHERE bookings\.lead_id = leads\.id\)/);
});
