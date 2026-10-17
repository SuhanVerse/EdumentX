export interface RiskScoreInput {
  quality: number;
  tamper: number;
  identity: number;
  face: number;
}

export const RISK_SCORE_WEIGHTS = {
  quality: 0.25,
  tamper: 0.25,
  identity: 0.25,
  face: 0.25,
} as const;

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function calculateRiskScore(input: RiskScoreInput): number {
  const { quality, tamper, identity, face } = input;

  const components = { quality, tamper, identity, face } as const;
  for (const value of Object.values(components)) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new TypeError('Risk score inputs must be numbers');
    }
  }

  let weighted = 0;
  for (const key of Object.keys(RISK_SCORE_WEIGHTS) as (keyof typeof RISK_SCORE_WEIGHTS)[]) {
    weighted += clamp(components[key]) * RISK_SCORE_WEIGHTS[key];
  }

  return Math.round(weighted);
}
