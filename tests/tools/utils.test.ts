import { describe, expect, it } from 'vitest';
import { buildQueryString, flattenI18n, wrapPaginated } from '../../src/tools/utils.js';

describe('buildQueryString', () => {
  it('returns query string with all defined params', () => {
    const result = buildQueryString({ page: 1, per_page: 20, q: 'shirt' });
    expect(result).toBe('?page=1&per_page=20&q=shirt');
  });

  it('filters out undefined values', () => {
    const result = buildQueryString({ page: 1, q: undefined });
    expect(result).toBe('?page=1');
  });

  it('filters out null values', () => {
    const result = buildQueryString({ page: 1, q: null });
    expect(result).toBe('?page=1');
  });

  it('returns empty string for empty params', () => {
    const result = buildQueryString({});
    expect(result).toBe('');
  });

  it('returns empty string when all values are undefined', () => {
    const result = buildQueryString({ page: undefined, q: undefined });
    expect(result).toBe('');
  });
});

describe('wrapPaginated', () => {
  it('wraps items with pagination metadata', () => {
    const items = ['a', 'b', 'c'];
    const result = wrapPaginated(items, 1, 5);
    expect(result).toEqual({
      results: ['a', 'b', 'c'],
      pagination: { page: 1, per_page: 5, has_more: false },
    });
  });

  it('sets has_more: false when items.length < per_page', () => {
    const result = wrapPaginated(['a', 'b', 'c'], 1, 5);
    expect(result.pagination.has_more).toBe(false);
  });

  it('sets has_more: true when items.length === per_page', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const result = wrapPaginated(items, 1, 5);
    expect(result.pagination.has_more).toBe(true);
  });

  it('preserves page and per_page in pagination', () => {
    const result = wrapPaginated([], 3, 10);
    expect(result.pagination.page).toBe(3);
    expect(result.pagination.per_page).toBe(10);
  });
});

describe('flattenI18n', () => {
  it('returns first non-empty value from i18n object', () => {
    const result = flattenI18n({ pt: 'Camiseta', en: 'T-shirt' });
    expect(result).toBe('Camiseta');
  });

  it('returns first non-empty value skipping empty strings', () => {
    const result = flattenI18n({ pt: '', en: 'T-shirt' });
    expect(result).toBe('T-shirt');
  });

  it('returns plain string directly', () => {
    const result = flattenI18n('plain string');
    expect(result).toBe('plain string');
  });

  it('returns empty string for null', () => {
    const result = flattenI18n(null);
    expect(result).toBe('');
  });

  it('returns empty string for undefined', () => {
    const result = flattenI18n(undefined);
    expect(result).toBe('');
  });

  it('returns empty string when all i18n values are empty', () => {
    const result = flattenI18n({ pt: '', en: '' });
    expect(result).toBe('');
  });
});
