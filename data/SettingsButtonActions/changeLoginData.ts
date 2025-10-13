import { runAsync, queryAll } from '../../services/feedbackRepo';

export type ChangeLoginArgs = {
  accountId: string; // ACCOUNTID of current user
  newUsername: string;
  newPassword: string;
};

// Discover the actual password column from table schema
async function resolvePasswordColumnStrict(): Promise<string> {
  const pragmaRows = await queryAll<any>('PRAGMA table_info(users);');
  const names: string[] = pragmaRows
    .map((r: any) => String(r?.name ?? r?.NAME ?? ''))
    .filter(Boolean);

  const candidates = ['password', 'passwrd', 'passwd', 'pass', 'pwd', 'pswd'];
  for (const want of candidates) {
    const found = names.find((n) => n.toLowerCase() === want);
    if (found) return found;
  }

  throw new Error('Password column not found in users table.');
}

export async function changeLoginData({ accountId, newUsername, newPassword }: ChangeLoginArgs): Promise<boolean> {
  try {
    // Enforce unique username (exclude self)
    const existsRows = await queryAll<any>(
      'SELECT ACCOUNTID FROM users WHERE USERNM = ? AND ACCOUNTID <> ? LIMIT 1;',
      [newUsername, accountId]
    );
    if (existsRows.length > 0) {
      throw new Error('Username already exists.');
    }

    const pwCol = await resolvePasswordColumnStrict();

    await runAsync('BEGIN');
    await runAsync('UPDATE users SET userNm = ? WHERE ACCOUNTID = ?;', [newUsername, accountId]);
    await runAsync(`UPDATE users SET ${pwCol} = ? WHERE ACCOUNTID = ?;`, [newPassword, accountId]);
    await runAsync('COMMIT');

    return true;
  } catch (err) {
    try { await runAsync('ROLLBACK'); } catch {}
    console.error('changeLoginData failed:', err);
    return false;
  }
}