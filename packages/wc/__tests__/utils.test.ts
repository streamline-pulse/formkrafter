import { describe, expect, test } from 'bun:test';
import { applyMask } from '../src/utils/mask';
import { normalizeOptions } from '../src/utils/options';

describe('applyMask', () => {
  test('digit mask keeps only digits and truncates', () => {
    expect(applyMask('90123456', '99999999')).toBe('90123456');
    expect(applyMask('9a0b1', '999')).toBe('901');
    expect(applyMask('901234567890', '99999999')).toBe('90123456');
  });

  test('literals are inserted automatically', () => {
    expect(applyMask('22912345678', '+999 99 99 99 99')).toBe('+229 12 34 56 78');
    expect(applyMask('W123456789', 'a999999999')).toBe('W123456789');
  });

  test('uppercase placeholder folds case, star accepts alphanumerics', () => {
    expect(applyMask('ab12', 'AA-**')).toBe('AB-12');
  });

  test('typed literals are not doubled', () => {
    expect(applyMask('+229 90', '+999 99')).toBe('+229 90');
  });

  test('no mask returns raw value', () => {
    expect(applyMask('anything', undefined)).toBe('anything');
    expect(applyMask('anything', '')).toBe('anything');
  });
});

describe('normalizeOptions nested keys', () => {
  const countries = [
    { name: { common: 'Togo', official: 'République togolaise' }, cca2: 'TG' },
    { name: { common: 'Bénin', official: 'République du Bénin' }, cca2: 'BJ' },
  ];

  test('resolves dotted label paths', () => {
    expect(normalizeOptions(countries, 'name.common', 'cca2')).toEqual([
      { label: 'Togo', value: 'TG' },
      { label: 'Bénin', value: 'BJ' },
    ]);
  });

  test('flat keys still work', () => {
    expect(
      normalizeOptions([{ label: 'A', value: 'a' }], 'label', 'value')
    ).toEqual([{ label: 'A', value: 'a' }]);
  });

  test('missing path falls back to the other key', () => {
    expect(normalizeOptions(countries, 'name.missing', 'cca2')).toEqual([
      { label: 'TG', value: 'TG' },
      { label: 'BJ', value: 'BJ' },
    ]);
  });
});
