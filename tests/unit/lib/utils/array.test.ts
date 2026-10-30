import { describe, expect, test } from 'bun:test';
import { sameItems } from '@/lib/utils/array.ts';

describe('sameItems', () => {
  test('ignores order', () => {
    expect(sameItems(['de', 'fr'], ['fr', 'de'])).toBe(true);
  });

  test('treats null and undefined as empty', () => {
    expect(sameItems(null, [])).toBe(true);
    expect(sameItems(undefined, null)).toBe(true);
    expect(sameItems(null, ['de'])).toBe(false);
  });

  test('rejects a different length', () => {
    expect(sameItems(['de'], ['de', 'fr'])).toBe(false);
  });

  test('rejects different items', () => {
    expect(sameItems(['de'], ['fr'])).toBe(false);
  });
});
