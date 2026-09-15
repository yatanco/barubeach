import test from 'node:test';
import assert from 'node:assert/strict';
import { sha256Hex, normalizeEmail, normalizePhone } from '../src/lib/metaCapi.ts';

test('normalizeEmail lowercases and trims', () => {
  assert.equal(normalizeEmail('  Guest@Example.COM '), 'guest@example.com');
});

test('normalizePhone strips everything but digits', () => {
  assert.equal(normalizePhone('+57 300 000 0000'), '573000000000');
});

test('sha256Hex produces the expected hex digest, matching Meta\'s hashing requirement', async () => {
  const hash = await sha256Hex('guest@example.com');
  assert.equal(hash, '513935c4d2db2d2d984dff1d68397f6e2ac8c4e5c48c92bd98e02bdc90b7aefe');
  assert.match(hash, /^[0-9a-f]{64}$/);
});
