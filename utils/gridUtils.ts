// utils/gridUtils.ts
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
