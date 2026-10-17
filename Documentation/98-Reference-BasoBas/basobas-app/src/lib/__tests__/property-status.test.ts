import { recalculatePropertyStatus, HIGH_DEMAND_THRESHOLD } from '../property-status';

describe('UT — recalculatePropertyStatus() [TS mirror of SQL trigger]', () => {
  test('UT-05a: 2 active visits keeps AVAILABLE', () => {
    expect(recalculatePropertyStatus('AVAILABLE', 2, 0)).toBe('AVAILABLE');
  });

  test('UT-05b: 3 pending visits flips to HIGH_DEMAND', () => {
    expect(recalculatePropertyStatus('AVAILABLE', 3, 0)).toBe('HIGH_DEMAND');
  });

  test('UT-05c: any discussion visit wins over pending count', () => {
    expect(recalculatePropertyStatus('AVAILABLE', 5, 1)).toBe('UNDER_DISCUSSION');
  });

  test('UT-05d: OCCUPIED is terminal and never downgraded', () => {
    expect(recalculatePropertyStatus('OCCUPIED', 4, 2)).toBe('OCCUPIED');
  });

  test('bonus: threshold constant is 3', () => {
    expect(HIGH_DEMAND_THRESHOLD).toBe(3);
  });
});
