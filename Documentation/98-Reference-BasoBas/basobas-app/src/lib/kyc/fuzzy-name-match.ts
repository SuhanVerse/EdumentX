function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  let curr: number[] = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

export function fuzzyNameMatch(a: string, b: string): number {
  if (typeof a !== 'string' || typeof b !== 'string') return 0;

  const na = normalizeName(a);
  const nb = normalizeName(b);

  if (na.length === 0 && nb.length === 0) return 100;
  if (na === nb) return 100;
  if (na.length === 0 || nb.length === 0) return 0;

  const distance = levenshtein(na, nb);
  const score = (1 - distance / Math.max(na.length, nb.length)) * 100;

  return Math.max(0, Math.min(100, Math.round(score)));
}
