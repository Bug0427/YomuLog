// utils/idGenerator.ts
export function makeId(prefix = ''): string {
  const date = new Date();
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const dateStr = yyyy + mm + dd;                       // YYYYMMDD
  const time = Date.now().toString(36);                 // base36 timestamp
  const rand = Math.random().toString(36).slice(2, 8); // 6 random chars
  return (prefix ? prefix + '_' : '') + dateStr + '_' + time + rand; // e.g. RPT_20251016_lk44r3w9q2
}