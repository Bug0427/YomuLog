// utils/gridWidths.ts
export const CHAR_PX = 8; // px per character (heuristic for 14–16pt)
export const PAD_CH = 3;  // natural width padding (per side) in characters

const TIE_BREAK_ORDER = [
  'username','usernm','user_name',
  'password','pswd','pass',
  'email','e-mail','mail',
  'level','lvl','securitylvl',
  'id'
];

export const tieRank = (key: string) => {
  const k = key.toLowerCase();
  const idx = TIE_BREAK_ORDER.indexOf(k);
  return idx === -1 ? 999 : idx;
};

export const abbrevForKey = (key: string, fullTitle: string) => {
  const k = key.toLowerCase();
  if (k === 'username' || k === 'usernm' || k === 'user_name') return 'userNm';
  if (k === 'password' || k === 'pswd' || k === 'pass') return 'PSWD';
  if (k === 'email' || k === 'e-mail' || k === 'mail') return 'E-M';
  if (k === 'level' || k === 'lvl' || k === 'securitylvl') return 'Lvl';
  return fullTitle;
};

export const charsThatFit = (px: number) => Math.max(1, Math.floor(px / CHAR_PX));

export type ColumnAny<T> = { key: keyof T | string; title: string };

export function calcExpandedWidth<T>(columns: ColumnAny<T>[], data: T[], colIndex: number, available: number) {
  const col = columns[colIndex];
  const values = data.map((r) => String((r as any)[col.key] ?? ''));
  const longestLen = Math.max(String(col.title ?? '').length, ...values.map((s) => s.length));
  const estPx = Math.ceil(CHAR_PX * (longestLen + PAD_CH * 2));
  return Math.min(estPx, Math.ceil(available * 0.9));
}

export function computeColumnWidths<T>(
  columns: ColumnAny<T>[],
  data: T[],
  screenWidth: number,
  expandedKey?: string
): number[] {
  const padding = 0;
  const available = Math.max(320, screenWidth - padding);
  const n = Math.max(1, columns.length);

  // Natural width per column = longest content (incl. title) + 2*PAD_CH
  const naturalPx = columns.map((c) => {
    const values = data.map((r) => String((r as any)[c.key] ?? ''));
    const longest = Math.max(String(c.title ?? '').length, ...values.map((s) => s.length));
    return Math.ceil(CHAR_PX * (longest + PAD_CH * 2));
  });

  // Collapsed minimum per column = (abbreviated title + 4) * CHAR_PX
  const minCollapsedPx = columns.map((c) => {
    const k = String(c.key);
    const short = abbrevForKey(k, c.title);
    return Math.ceil(CHAR_PX * (String(short).length + 4));
  });

  // Start from exact collapsed minima
  let widths = [...minCollapsedPx];

  // Extra pixels to distribute to columns with the biggest need
  const sumMin = widths.reduce((a, b) => a + b, 0);
  let distribution = available - sumMin;

  if (distribution > 0) {
    const deltas = widths.map((w, i) => Math.max(0, naturalPx[i] - w));
    let sumDelta = deltas.reduce((a, b) => a + b, 0);

    if (sumDelta === 0) {
      const baseAdd = Math.floor(distribution / n);
      widths = widths.map((w) => w + baseAdd);
      let rem = distribution - baseAdd * n;
      for (let i = 0; i < n && rem > 0; i++) { widths[i] += 1; rem -= 1; }
    } else {
      const adds = new Array(n).fill(0);
      for (let i = 0; i < n; i++) adds[i] = Math.floor((deltas[i] / sumDelta) * distribution);
      let usedAdd = adds.reduce((a, b) => a + b, 0);
      let leftover = distribution - usedAdd;
      const order = [...Array(n).keys()].sort((a, b) => {
        if (deltas[b] !== deltas[a]) return deltas[b] - deltas[a];
        return tieRank(String(columns[a].key)) - tieRank(String(columns[b].key));
      });
      let oi = 0;
      while (leftover > 0) {
        const idx = order[oi % order.length];
        if (deltas[idx] > 0) { adds[idx] += 1; leftover -= 1; }
        oi++;
      }
      widths = widths.map((w, i) => w + Math.min(adds[i], deltas[i]));
    }
  }

  if (!expandedKey) return widths;

  const ei = columns.findIndex((c) => String(c.key) === expandedKey);
  if (ei < 0) return widths;

  const othersMinSum = minCollapsedPx.reduce((a, b, i) => (i === ei ? a : a + b), 0);
  const maxForExpanded = Math.max(0, available - othersMinSum);
  const expandedTarget = Math.min(naturalPx[ei], maxForExpanded);

  widths = widths.map((_, i) => (i === ei ? expandedTarget : minCollapsedPx[i]));

  // Distribute any remaining pixels by need (favor expanded first), in chunks
  let used = widths.reduce((a, b) => a + b, 0);
  let diff = available - used;
  if (diff > 0) {
    const targets = widths.map((w, i) => (i === ei ? naturalPx[i] : minCollapsedPx[i]));
    let needs = widths.map((w, i) => Math.max(0, targets[i] - w));
    const order2 = [...Array(n).keys()].sort((a, b) => {
      if (needs[b] !== needs[a]) return needs[b] - needs[a];
      return tieRank(String(columns[a].key)) - tieRank(String(columns[b].key));
    });
    for (const idx of order2) {
      if (diff <= 0) break;
      const give = Math.min(diff, needs[idx]);
      if (give > 0) { widths[idx] += give; diff -= give; needs[idx] = 0; }
    }
    if (diff > 0) {
      const base = Math.floor(diff / n);
      if (base > 0) { for (let i = 0; i < n; i++) widths[i] += base; diff -= base * n; }
      let k = 0; while (diff > 0) { widths[k % n] += 1; diff -= 1; k++; }
    }
  }

  return widths;
}
