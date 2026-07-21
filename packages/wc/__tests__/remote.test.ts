import { describe, expect, test } from 'bun:test';
import {
  appendSearchParam,
  interpolateTemplate,
  parseHeaderLines,
} from '../src/utils/remote';

describe('remote helpers', () => {
  test('interpolates {tokens} from the data map', () => {
    expect(
      interpolateTemplate('/api/cities?country={country}', { country: 'BJ' })
    ).toBe('/api/cities?country=BJ');
    expect(interpolateTemplate('Bearer {token}', {})).toBe('Bearer ');
    expect(interpolateTemplate('no tokens', { a: 1 })).toBe('no tokens');
  });

  test('parses header lines with interpolation', () => {
    expect(
      parseHeaderLines('Authorization: Bearer {token}\nX-Tenant: kora', {
        token: 'abc123',
      })
    ).toEqual({
      Authorization: 'Bearer abc123',
      'X-Tenant': 'kora',
    });

    expect(parseHeaderLines('', {})).toBeUndefined();
    expect(parseHeaderLines('malformed line', {})).toBeUndefined();
    expect(parseHeaderLines(undefined, {})).toBeUndefined();
  });

  test('appends the search param with proper separators and encoding', () => {
    expect(appendSearchParam('/api/users', 'q', 'ada')).toBe('/api/users?q=ada');
    expect(appendSearchParam('/api/users?limit=10', 'q', 'a b')).toBe(
      '/api/users?limit=10&q=a%20b'
    );
    expect(appendSearchParam('/api/users', 'q', '')).toBe('/api/users');
  });
});
