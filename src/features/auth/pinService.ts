import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Transaction PIN — the fallback when biometrics are unavailable, not enrolled,
 * locked out, or the user chooses "Use PIN".
 *
 * - Only a salted SHA-256 hash is stored, in the iOS Keychain / Android Keystore
 *   (SecureStore), with THIS_DEVICE_ONLY so it is never synced or restored to
 *   another phone.
 * - Failed attempts are persisted, so killing the app does not reset the counter.
 * - Production note: a 6-digit PIN has only 10^6 combinations, so the real check
 *   must happen server-side (or with a hardware-backed key); this local check is
 *   for the assessment's offline scope. See DESIGN.md.
 */
export const PIN_LENGTH = 6;
export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCKOUT_MS = 60_000;

const PIN_KEY = 'biopay.txn_pin.v1';
const ATTEMPTS_KEY = 'biopay.txn_pin_attempts.v1';
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

interface PinRecord {
  salt: string;
  hash: string;
}

interface AttemptState {
  failures: number;
  lockedUntil: number | null;
}

export type PinVerifyResult =
  | { status: 'ok' }
  | { status: 'wrong'; attemptsLeft: number }
  | { status: 'locked'; retryAt: number }
  | { status: 'not_set' };

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(key, STORE_OPTIONS);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

const writeJson = (key: string, value: unknown) => SecureStore.setItemAsync(key, JSON.stringify(value), STORE_OPTIONS);

/** Returns a user-facing reason if the PIN is too easy to guess, otherwise null. */
export function validateNewPin(pin: string): string | null {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) return `Your PIN must be ${PIN_LENGTH} digits.`;
  if (/^(\d)\1+$/.test(pin)) return 'Avoid repeating the same digit.';
  if ('0123456789'.includes(pin) || '9876543210'.includes(pin)) return 'Avoid sequences like 123456.';
  return null;
}

export const pinService = {
  async hasPin(): Promise<boolean> {
    return (await readJson<PinRecord>(PIN_KEY)) !== null;
  },

  async setPin(pin: string): Promise<void> {
    const problem = validateNewPin(pin);
    if (problem) throw new Error(problem);
    const salt = toHex(await Crypto.getRandomBytesAsync(16));
    await writeJson(PIN_KEY, { salt, hash: await hashPin(pin, salt) } satisfies PinRecord);
    await SecureStore.deleteItemAsync(ATTEMPTS_KEY, STORE_OPTIONS);
  },

  async verifyPin(pin: string, now: number = Date.now()): Promise<PinVerifyResult> {
    const record = await readJson<PinRecord>(PIN_KEY);
    if (!record) return { status: 'not_set' };

    const attempts = (await readJson<AttemptState>(ATTEMPTS_KEY)) ?? { failures: 0, lockedUntil: null };
    if (attempts.lockedUntil && attempts.lockedUntil > now) {
      return { status: 'locked', retryAt: attempts.lockedUntil };
    }

    if ((await hashPin(pin, record.salt)) === record.hash) {
      await SecureStore.deleteItemAsync(ATTEMPTS_KEY, STORE_OPTIONS);
      return { status: 'ok' };
    }

    const failures = (attempts.lockedUntil ? 0 : attempts.failures) + 1;
    if (failures >= MAX_PIN_ATTEMPTS) {
      const retryAt = now + PIN_LOCKOUT_MS;
      await writeJson(ATTEMPTS_KEY, { failures: 0, lockedUntil: retryAt } satisfies AttemptState);
      return { status: 'locked', retryAt };
    }
    await writeJson(ATTEMPTS_KEY, { failures, lockedUntil: null } satisfies AttemptState);
    return { status: 'wrong', attemptsLeft: MAX_PIN_ATTEMPTS - failures };
  },

  /** Dev/test helper. */
  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(PIN_KEY, STORE_OPTIONS),
      SecureStore.deleteItemAsync(ATTEMPTS_KEY, STORE_OPTIONS),
    ]);
  },
};
