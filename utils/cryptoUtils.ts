// utils/cryptoUtils.ts
// Platform-safe password hashing using Web Crypto API (PBKDF2).
// Works on iOS, Android, and Web without native module dependencies.
//
// Previously used bcryptjs which depends on Node.js crypto module —
// this caused a blank-screen crash on web because crypto is not
// available in React Native / Expo web bundles.

// ─── Constants ───────────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 100_000; // OWASP recommended minimum for PBKDF2-HMAC-SHA256
const SALT_BYTES = 16;
const HASH_ALGORITHM = 'SHA-256';

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random salt.
 * On web: uses crypto.getRandomValues.
 * On native: uses expo-random, falling back to Math.random with warning.
 */
async function generateSalt(): Promise<Uint8Array> {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const salt = new Uint8Array(SALT_BYTES);
    crypto.getRandomValues(salt);
    return salt;
  }

  // Fallback for environments without crypto.getRandomValues
  // (should not happen in modern RN/Expo, but be safe)
  try {
    const Random = await import('expo-random');
    return await Random.getRandomBytesAsync(SALT_BYTES);
  } catch {
    // Last resort: Math.random (not cryptographically secure, but prevents crash)
    console.warn('[cryptoUtils] No secure RNG available, using Math.random fallback');
    const salt = new Uint8Array(SALT_BYTES);
    for (let i = 0; i < SALT_BYTES; i++) {
      salt[i] = Math.floor(Math.random() * 256);
    }
    return salt;
  }
}

/**
 * Convert a Uint8Array to a hex string.
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert a hex string to a Uint8Array.
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Derive a key from a password and salt using PBKDF2.
 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    256, // 256 bits = 32 bytes
  );

  return new Uint8Array(derivedBits);
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Hash a password with a random salt.
 * Returns a string in the format: iterations$saltHex$hashHex
 */
export async function hashPassword(password: string): Promise<string> {
  // Web Crypto API works on all platforms with Expo
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const salt = await generateSalt();
    const hash = await deriveKey(password, salt);
    return `${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
  }

  // Fallback for environments without crypto.subtle (extremely rare)
  // Defer to bcryptjs only on native (it's lazy-loaded)
  try {
    const bcrypt = await import('bcryptjs');
    const saltRounds = 12;
    const salt = await bcrypt.genSalt(saltRounds);
    return bcrypt.hash(password, salt);
  } catch (e) {
    throw new Error(
      `Password hashing unavailable: ${e instanceof Error ? e.message : 'unknown error'}`,
    );
  }
}

/**
 * Verify a password against a stored hash.
 * The stored hash should be in the format produced by hashPassword().
 */
export async function verifyPassword(
  hashed: string,
  candidate: string,
): Promise<boolean> {
  // Check if it's a PBKDF2 hash (format: iterations$saltHex$hashHex)
  const parts = hashed.split('$');
  if (parts.length === 3 && /^\d+$/.test(parts[0])) {
    // PBKDF2 format
    const iterations = parseInt(parts[0], 10);
    const salt = hexToBytes(parts[1]);
    const expectedHash = parts[2];

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(candidate),
      'PBKDF2',
      false,
      ['deriveBits'],
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: HASH_ALGORITHM,
      },
      keyMaterial,
      256,
    );

    const candidateHash = bytesToHex(new Uint8Array(derivedBits));
    return candidateHash === expectedHash;
  }

  // Fallback: bcryptjs format (for backward compatibility with existing hashes)
  try {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(candidate, hashed);
  } catch (e) {
    console.warn('[cryptoUtils] Password verification failed:', e);
    return false;
  }
}
