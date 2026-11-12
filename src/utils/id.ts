import * as Crypto from 'expo-crypto';

/** Cryptographically random v4 UUID (used for idempotency keys and ids). */
export function createId(): string {
  return Crypto.randomUUID();
}
