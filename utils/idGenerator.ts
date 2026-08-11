// utils/idGenerator.ts
// Secure storage wrapper — uses AsyncStorage on web (where SecureStore is unavailable),
// and expo-secure-store on native platforms. All access is lazy to avoid bundler crashes.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isWeb } from './platformUtils';

let counter = 0; // keeps track across calls

const SEQ_STORE_PREFIX = 'id_seq_v1_';       // per-day counter for generic IDs
const USER_SEQ_STORE_PREFIX = 'user_id_v1_'; // last value guard for user IDs

/** Lazy-loaded secure store — only imported on native platforms. */
let _SecureStore: typeof import('expo-secure-store') | null = null;
async function getSecureStore() {
  if (_SecureStore) return _SecureStore;
  // expo-secure-store has no functional web build (the web module is an empty
  // object, so its methods throw) — always fall back to AsyncStorage on web.
  if (isWeb) return null;
  try {
    _SecureStore = await import('expo-secure-store');
    return _SecureStore;
  } catch {
    // Web / unsupported platform — fall back to AsyncStorage below
    return null;
  }
}

async function secureGetItem(key: string): Promise<string | null> {
  const SecureStore = await getSecureStore();
  if (SecureStore) {
    return SecureStore.getItemAsync(key);
  }
  // Fallback: AsyncStorage (works on all platforms including web)
  return AsyncStorage.getItem(key);
}

async function secureSetItem(key: string, value: string): Promise<void> {
  const SecureStore = await getSecureStore();
  if (SecureStore) {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
    return;
  }
  // Fallback: AsyncStorage
  await AsyncStorage.setItem(key, value);
}

async function loadSeq(key: string): Promise<{ counter: number; lastId: string | null }>{
  try {
    const raw = await secureGetItem(key);
    if (!raw) return { counter: 0, lastId: null };
    const parsed = JSON.parse(raw);
    return { counter: Number(parsed.counter) || 0, lastId: parsed.lastId ?? null };
  } catch {
    return { counter: 0, lastId: null };
  }
}

async function saveSeq(key: string, counter: number, lastId: string){
  await secureSetItem(key, JSON.stringify({ counter, lastId }));
}

function numToAlphaSeq(n: number): string {
  // Convert number to digit+letter style, repeat as needed
  const digits = '0123456789';
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let seq = '';
  let num = n;
  if (num === 0) {
    return '0a';
  }
  while (num > 0) {
    const d = digits[num % 10];
    num = Math.floor(num / 10);
    const l = letters[num % 26];
    num = Math.floor(num / 26);
    seq = d + l + seq;
  }
  return seq;
}

export function makeId(prefix = ''): string {
  const date = new Date();
  const dd = date.getDate().toString().padStart(2, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const yy = date.getFullYear().toString().slice(-2);
  const dateStr = dd + mm + yy; // ddmmyy
  const seq = numToAlphaSeq(counter++);
  return (prefix ? prefix : '') + seq + dateStr;
}

/**
 * Generate a unique ID with optional type-determined prefix (e.g., "RPT", "REV", "RAT").
 * Prefixes are for easier human reading and to separate types, but are optional.
 * If a prefix is provided, it is prepended to the generated ID and used to separate the sequence in SecureStore.
 */
export async function makeIdSafe(prefix: string = ''): Promise<string> {
  const date = new Date();
  const dd = date.getDate().toString().padStart(2, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const yy = date.getFullYear().toString().slice(-2);
  const dateStr = dd + mm + yy; // ddmmyy
  // Use the prefix as part of the key to keep sequences separated by type
  const storeKey = `${SEQ_STORE_PREFIX}${dateStr}_${prefix || 'default'}`;
  let { counter: c, lastId } = await loadSeq(storeKey);

  // Generate until we produce a value different from the last saved one
  // (this also naturally increments for each call)
  let attempt = 0;
  let id = '';
  do {
    const seq = numToAlphaSeq(c++);
    id = (prefix ? prefix : '') + seq + dateStr;
    attempt++;
  } while (id === lastId && attempt < 3);

  await saveSeq(storeKey, c, id);
  return id;
}
// --- User ID generation ---
// Format: <level><0><ddmmyy><first2letters><random6>
// Example: 10101625bu2u3j4n

function randAlnum(len: number): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let out = '';
  // Use Math.random here; switch to expo-random if you want cryptographic randomness
  while (out.length < len) {
    const r = Math.floor(Math.random() * chars.length);
    out += chars[r];
  }
  return out;
}

function firstTwoLetters(username: string): string {
  const letters = (username || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (letters.length >= 2) return letters.slice(0, 2);
  if (letters.length === 1) return letters + 'x';
  return 'xx';
}

export type UserLevel = 1 | 2 | 3;

export function makeUserId(level: UserLevel, username: string): string {
  const date = new Date();
  const dd = date.getDate().toString().padStart(2, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const yy = date.getFullYear().toString().slice(-2);
  const dateStr = dd + mm + yy; // ddmmyy

  const first2 = firstTwoLetters(username);
  const rand6 = randAlnum(6);

  return `${level}0${dateStr}${first2}${rand6}`;
}

export async function makeUserIdSafe(level: UserLevel, username: string): Promise<string> {
  const date = new Date();
  const dd = date.getDate().toString().padStart(2, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const yy = date.getFullYear().toString().slice(-2);
  const dateStr = dd + mm + yy; // ddmmyy

  const first2 = firstTwoLetters(username);
  const storeKey = `${USER_SEQ_STORE_PREFIX}${dateStr}_${level}_${first2}`;
  const { lastId } = await loadSeq(storeKey);

  let uid = '';
  let guard = 0;
  do {
    const rand6 = randAlnum(6);
    uid = `${level}0${dateStr}${first2}${rand6}`;
    guard++;
  } while (uid === lastId && guard < 3);

  await saveSeq(storeKey, 0, uid);
  return uid;
}

/**
 * NOTE: Prefer `makeIdSafe` / `makeUserIdSafe` in production to avoid duplicates across app restarts.
 * `makeId` / `makeUserId` remain for backward compatibility and testing.
 */