import { normalizeNepalPhone } from '../phone';

describe('UT — normalizeNepalPhone()', () => {
  test('UT-01: normalizes a valid 10-digit mobile number', () => {
    expect(normalizeNepalPhone('9812345678')).toBe('+9779812345678');
  });

  test('UT-02a: rejects malformed input (landline fragment)', () => {
    expect(normalizeNepalPhone('091234')).toBeNull();
  });

  test('UT-02b: rejects empty string', () => {
    expect(normalizeNepalPhone('')).toBeNull();
  });

  test('UT-02c: rejects non-numeric garbage', () => {
    expect(normalizeNepalPhone('abcdefgh')).toBeNull();
  });

  test('UT-02d: rejects too-long digit strings', () => {
    expect(normalizeNepalPhone('12345678901')).toBeNull();
  });

  test('bonus: accepts +977-prefixed E.164 input idempotently', () => {
    expect(normalizeNepalPhone('+9779812345678')).toBe('+9779812345678');
  });

  test('bonus: tolerates spaces, dashes and parentheses', () => {
    expect(normalizeNepalPhone('+977 (981)-234-5678')).toBe('+9779812345678');
  });
});
