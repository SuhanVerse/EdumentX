import { calculateRiskScore } from '../risk-score';

describe('UT — calculateRiskScore()', () => {
  test('UT-04: report scenario (90, 95, 88, 91) scores ~91', () => {
    const score = calculateRiskScore({
      quality: 90,
      tamper: 95,
      identity: 88,
      face: 91,
    });
    expect(score).toBeCloseTo(91, 0);
    expect(score).toBe(91);
  });

  test('bonus: perfect inputs score 100', () => {
    expect(calculateRiskScore({ quality: 100, tamper: 100, identity: 100, face: 100 })).toBe(100);
  });

  test('bonus: zero inputs score 0', () => {
    expect(calculateRiskScore({ quality: 0, tamper: 0, identity: 0, face: 0 })).toBe(0);
  });

  test('bonus: out-of-range values are clamped', () => {
    const score = calculateRiskScore({
      quality: 150,
      tamper: -20,
      identity: 100,
      face: 100,
    });
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  test('bonus: non-numeric input throws TypeError', () => {
    expect(() => calculateRiskScore({ quality: NaN, tamper: 95, identity: 88, face: 91 })).toThrow(
      TypeError
    );
  });
});
