import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFullFoodServiceCop, calculatePackageCop, calculateTransportCop } from '../src/lib/sales-calculations.ts';

test('full food service uses people times service days', () => {
  assert.equal(calculateFullFoodServiceCop(7, 2), 2_100_000);
  assert.equal(calculateFullFoodServiceCop(0, 2), 0);
  assert.throws(() => calculateFullFoodServiceCop(2.5, 2));
});

test('transport rates distinguish Barú round trip and Cartagena legs', () => {
  assert.equal(calculateTransportCop('baru_round_trip'), 300_000);
  assert.equal(calculateTransportCop('cartagena', 1), 700_000);
  assert.equal(calculateTransportCop('cartagena', 2), 1_400_000);
});

test('package total combines only deterministic entered parts', () => {
  assert.equal(calculatePackageCop({ accommodation: 3_000_000, food: 2_100_000, transport: 300_000 }), 5_400_000);
  assert.throws(() => calculatePackageCop({ accommodation: -1 }));
});
