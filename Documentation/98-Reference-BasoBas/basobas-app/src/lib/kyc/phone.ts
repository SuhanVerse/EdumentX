export type PhoneNormalizationResult = string | null;

const NEPAL_COUNTRY_CODE = '977';
const MOBILE_LENGTH = 10;

function stripDialingNoise(raw: string): string {
  return raw.replace(/[\s\-().]/g, '');
}

export function normalizeNepalPhone(raw: string): PhoneNormalizationResult {
  if (typeof raw !== 'string') return null;

  let digits = stripDialingNoise(raw.trim());

  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (!/^\d+$/.test(digits)) return null;

  if (digits.startsWith(NEPAL_COUNTRY_CODE)) {
    digits = digits.slice(NEPAL_COUNTRY_CODE.length);
  }

  if (digits.length !== MOBILE_LENGTH) return null;
  if (!digits.startsWith('9')) return null;

  return `+${NEPAL_COUNTRY_CODE}${digits}`;
}
