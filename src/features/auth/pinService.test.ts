import { MAX_PIN_ATTEMPTS, PIN_LOCKOUT_MS, pinService, validateNewPin } from './pinService';

// In-memory Keychain and a real SHA-256 so hashing behaviour is exercised.
jest.mock('expo-secure-store', () => {
  const mockStore = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
  };
});
jest.mock('expo-crypto', () => {
  // Node's crypto, typed minimally so the app tsconfig doesn't need @types/node.
  const nodeCrypto = jest.requireActual('crypto') as {
    createHash: (alg: string) => { update: (d: string) => { digest: (enc: 'hex') => string } };
    randomBytes: (n: number) => Uint8Array;
  };
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: async (_alg: string, data: string) => nodeCrypto.createHash('sha256').update(data).digest('hex'),
    getRandomBytesAsync: async (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
  };
});

beforeEach(() => pinService.clear());

describe('validateNewPin', () => {
  it('rejects weak PINs with a reason', () => {
    expect(validateNewPin('12345')).toMatch(/6 digits/);
    expect(validateNewPin('111111')).toMatch(/same digit/);
    expect(validateNewPin('123456')).toMatch(/sequences/);
    expect(validateNewPin('654321')).toMatch(/sequences/);
    expect(validateNewPin('284716')).toBeNull();
  });
});

describe('pinService', () => {
  it('stores only a salted hash and verifies the correct PIN', async () => {
    const SecureStore = jest.requireMock<{ setItemAsync: jest.Mock }>('expo-secure-store');
    expect(await pinService.hasPin()).toBe(false);
    await pinService.setPin('284716');
    expect(await pinService.hasPin()).toBe(true);
    const stored = SecureStore.setItemAsync.mock.calls.at(-1)?.[1] as string;
    expect(stored).not.toContain('284716');
    await expect(pinService.verifyPin('284716')).resolves.toEqual({ status: 'ok' });
  });

  it('counts down attempts, then locks out, then recovers after the lockout window', async () => {
    await pinService.setPin('284716');
    const t0 = 1_000_000;
    for (let i = 1; i < MAX_PIN_ATTEMPTS; i++) {
      await expect(pinService.verifyPin('000001', t0)).resolves.toEqual({
        status: 'wrong',
        attemptsLeft: MAX_PIN_ATTEMPTS - i,
      });
    }
    await expect(pinService.verifyPin('000001', t0)).resolves.toEqual({ status: 'locked', retryAt: t0 + PIN_LOCKOUT_MS });
    // Even the correct PIN is refused during lockout.
    await expect(pinService.verifyPin('284716', t0 + 1000)).resolves.toMatchObject({ status: 'locked' });
    await expect(pinService.verifyPin('284716', t0 + PIN_LOCKOUT_MS + 1)).resolves.toEqual({ status: 'ok' });
  });

  it('reports when no PIN exists', async () => {
    await expect(pinService.verifyPin('284716')).resolves.toEqual({ status: 'not_set' });
  });
});
