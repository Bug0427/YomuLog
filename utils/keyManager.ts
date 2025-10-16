// utils/keyManager.ts
import * as SecureStore from 'expo-secure-store';
import * as Random from 'expo-random';

/**
 * We lazy-load libsodium so it doesn't slow cold start.
 * The single cached Promise ensures only one import occurs.
 */
let _sodiumPromise: Promise<any> | null = null;
async function sodium() {
  if (!_sodiumPromise) _sodiumPromise = import('react-native-libsodium'); // dynamic import
  const m = await _sodiumPromise;
  const s = m.default || m;
  if (typeof s.ready === 'function') await s.ready;
  return s;
}

/** SecureStore "drawer label" where the keyring JSON lives */
const KEYRING_SLOT = 'keyringcabinet_donttouch';

/** How many keys participate in write rotation (the "write pool") */
const WRITE_POOL_SIZE = 5;

/** How many encrypt operations before a key should stop being used for writes */
const MAX_ENCRYPT_USES = 5000;

/** One entry in the keyring */
export type KeyEntry = {
  kid: string;          // key id / label
  keyB64: string;       // base64-encoded raw key bytes
  uses?: number;        // number of encrypts performed with this key
  createdAt?: string;   // ISO timestamp when key was created
  lastUsedAt?: string;  // ISO timestamp of last encrypt with this key
};

/** Load the keyring from SecureStore (may return empty array) */
async function loadKeyring(): Promise<KeyEntry[]> {
    const raw = await SecureStore.getItemAsync(KEYRING_SLOT); // read string (or null)
    if (!raw) return [];                                      // no data -> empty ring
    try { return JSON.parse(raw) as KeyEntry[]; }             // parse JSON
    catch { return []; }                                      // bad JSON -> empty ring
}

/** Persist the keyring back to SecureStore */
async function saveKeyring(ring: KeyEntry[]) {
    await SecureStore.setItemAsync(KEYRING_SLOT, JSON.stringify(ring), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
}

/** Make a readable key id (timestamp + short random suffix) */
function newKid() {
  // e.g. k20251015T142530Z_ab12cd
    const t = new Date().toISOString().replace(/[-:.]/g, '').replace('T', 'T').replace('Z', 'Z');
    return `k${t}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Ensure the ring has a current key (index 0); create one if needed */
export async function ensureCurrentKey(): Promise<KeyEntry> {
    const ring = await loadKeyring();
    if (ring.length > 0) return ring[0];

    const s = await sodium();
    const raw = await Random.getRandomBytesAsync(s.crypto_aead_xchacha20poly1305_ietf_KEYBYTES);
    const keyB64 = s.to_base64(new Uint8Array(raw), s.base64_variants.ORIGINAL);
    const entry: KeyEntry = {
        kid: newKid(),
        keyB64,
        uses: 0,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
    };
    await saveKeyring([entry]);
    return entry;
    }

/** Always return a non-empty ring (creating one if necessary) */
    export async function getKeyring(): Promise<KeyEntry[]> {
    const ring = await loadKeyring();
    if (ring.length === 0) return [await ensureCurrentKey()];
    return ring;
    }

/** Rotate: prepend a brand-new key so it becomes the current one */
export async function rotateKey(): Promise<KeyEntry> {
    const ring = await getKeyring();
    const s = await sodium();
    const raw = await Random.getRandomBytesAsync(s.crypto_aead_xchacha20poly1305_ietf_KEYBYTES);
    const keyB64 = s.to_base64(new Uint8Array(raw), s.base64_variants.ORIGINAL);
    const entry: KeyEntry = {
        kid: newKid(),
        keyB64,
        uses: 0,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
    };
    ring.unshift(entry); // new current at index 0; keep old keys after
    await saveKeyring(ring);
    return entry;
}

/**
 * Choose a key from the write pool (top WRITE_POOL_SIZE keys).
 * Strategy:
 *  - Prefer the least-used key under MAX_ENCRYPT_USES.
 *  - If all pool keys are at/over cap, rotate in a new key and use it.
 *  - Bump the chosen key's usage + timestamp and persist.
 */
async function pickWriteKey(): Promise<KeyEntry> {
  let ring = await getKeyring();
  if (!ring.length) {
    await ensureCurrentKey();
    ring = await getKeyring();
  }

  const pool = ring.slice(0, Math.min(WRITE_POOL_SIZE, ring.length));
  const usable = pool.filter(k => (k.uses ?? 0) < MAX_ENCRYPT_USES);

  let chosen: KeyEntry;
  if (usable.length > 0) {
    chosen = usable.reduce((a, b) => ((a.uses ?? 0) <= (b.uses ?? 0) ? a : b));
  } else {
    // all pool keys exhausted -> rotate in a fresh one
    chosen = await rotateKey();
    ring = await getKeyring();
  }

  const idx = ring.findIndex(k => k.kid === chosen.kid);
  if (idx >= 0) {
    ring[idx].uses = (ring[idx].uses ?? 0) + 1;
    ring[idx].lastUsedAt = new Date().toISOString();
    await saveKeyring(ring);
  }

  return chosen;
}

/**
 * Encrypt with a selected key from the write pool.
 * Returns compact storage string: enc2:&lt;kid&gt;:&lt;nonceB64&gt;:&lt;ctB64&gt; (plus kid).
 */
export async function encryptWithCurrent(plaintext: string, aad: string) {
  const s = await sodium();
  const entry = await pickWriteKey(); // may rotate if pool exhausted

  const key = s.from_base64(entry.keyB64, s.base64_variants.ORIGINAL);
  const nonce = s.randombytes_buf(s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const aadBuf = s.from_string(aad);
  const ct = s.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, aadBuf, null, nonce, key);

  const nonceB64 = s.to_base64(nonce, s.base64_variants.ORIGINAL);
  const ctB64 = s.to_base64(ct, s.base64_variants.ORIGINAL);
  return { stored: `enc2:${entry.kid}:${nonceB64}:${ctB64}`, kid: entry.kid };
}

/**
 * Decrypt from plaintext/enc1/enc2; indicate if re-encrypt is recommended.
 *  - plaintext (no enc prefix) => return and suggest re-encrypt
 *  - enc1: try all keys in ring until one works, then suggest re-encrypt to enc2
 *  - enc2:&lt;kid&gt;:&lt;nonce&gt;:&lt;ct&gt;: use the right key by kid, suggest re-encrypt if not current
 */
export async function decryptWithKeyring(
  stored: string,
  aad: string
): Promise<{ plaintext: string; needsReencrypt: boolean; }> {
  const s = await sodium();

  // support legacy plaintext (no 'enc' prefix)
  if (!stored?.startsWith('enc')) {
    return { plaintext: stored ?? '', needsReencrypt: true };
  }

  // legacy enc1: 'enc1:nonce:ct' (no kid)
  if (stored.startsWith('enc1:')) {
    const [, nonceB64, ctB64] = stored.split(':');
    const ring = await getKeyring();
    const aadBuf = s.from_string(aad);
    for (const { keyB64 } of ring) {
      try {
        const key = s.from_base64(keyB64, s.base64_variants.ORIGINAL);
        const nonce = s.from_base64(nonceB64, s.base64_variants.ORIGINAL);
        const ct = s.from_base64(ctB64, s.base64_variants.ORIGINAL);
        const pt = s.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ct, aadBuf, nonce, key);
        return { plaintext: s.to_string(pt), needsReencrypt: true }; // upgrade to enc2
      } catch {
        // try next key
      }
    }
    throw new Error('decryptWithKeyring: enc1 failed for all keys');
  }

  // enc2:<kid>:<nonce>:<ct>
  if (stored.startsWith('enc2:')) {
    const [, kid, nonceB64, ctB64] = stored.split(':');
    const ring = await getKeyring();
    const currentKid = ring[0]?.kid;
    const entry = ring.find(k => k.kid === kid) || ring[0];
    if (!entry) throw new Error('decryptWithKeyring: no key available');

    const aadBuf = s.from_string(aad);
    const key = s.from_base64(entry.keyB64, s.base64_variants.ORIGINAL);
    const nonce = s.from_base64(nonceB64, s.base64_variants.ORIGINAL);
    const ct = s.from_base64(ctB64, s.base64_variants.ORIGINAL);
    const pt = s.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ct, aadBuf, nonce, key);
    return { plaintext: s.to_string(pt), needsReencrypt: kid !== currentKid };
  }

  throw new Error('decryptWithKeyring: unknown format');
}