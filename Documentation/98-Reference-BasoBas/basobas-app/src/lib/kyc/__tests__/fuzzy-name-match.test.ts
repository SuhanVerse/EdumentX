import { fuzzyNameMatch } from '../fuzzy-name-match';

describe('UT — fuzzyNameMatch()', () => {
  test('UT-03a: exact match ignoring case scores 100', () => {
    expect(fuzzyNameMatch('RAM BAHADUR SHRESTHA', 'Ram Bahadur Shrestha')).toBe(100);
  });

  test('UT-03b: exact match with extra whitespace scores 100', () => {
    expect(fuzzyNameMatch('Sita  Sharma', 'sita sharma')).toBe(100);
  });

  test('bonus: close typo still scores high', () => {
    const score = fuzzyNameMatch('Ram Bahadur Shresta', 'Ram Bahadur Shrestha');
    expect(score).toBeGreaterThanOrEqual(90);
    expect(score).toBeLessThan(100);
  });

  test('bonus: completely different names score low', () => {
    expect(fuzzyNameMatch('Ram Shrestha', 'Hari Thapa')).toBeLessThan(50);
  });

  test('bonus: empty input scores 0', () => {
    expect(fuzzyNameMatch('', 'Some Name')).toBe(0);
  });
});
