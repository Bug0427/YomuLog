

// utils/idGenerator.ts
export function makeId(prefix = ''): string {
  const time = Date.now().toString(36);               // base36 timestamp
  const rand = Math.random().toString(36).slice(2, 8); // 6 random chars
  return (prefix ? prefix + '_' : '') + time + rand;   // e.g. RPT_lk44r3w9q2
}