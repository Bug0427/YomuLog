// utils/cryptoUtils.ts
// React Native–compatible password hashing using bcryptjs.
// NOTE: For production server-side hashing, prefer Argon2id in your backend.

import bcrypt from 'bcryptjs';

const ROUNDS = 12; // tune as needed for device performance (10–12 common)

// Hash a password before saving to DB (client-side temporary solution)
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(ROUNDS);
  return bcrypt.hash(password, salt);
}

// Verify a login attempt against stored hash
export async function verifyPassword(hashed: string, candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, hashed);
}