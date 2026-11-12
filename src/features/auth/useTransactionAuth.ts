import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  authenticateWithBiometrics,
  getBiometricCapability,
  type BiometricCapability,
  type BiometricUnavailableReason,
} from './biometricService';
import type { PinModalProps, PinMode } from './PinModal';
import { pinService } from './pinService';

export type AuthResult =
  | { ok: true; method: 'biometric' | 'pin' }
  | { ok: false; reason: 'cancelled' | 'locked_out' | 'failed'; message?: string };

const UNAVAILABLE_COPY: Record<BiometricUnavailableReason, string> = {
  no_hardware: 'This device doesn’t support biometrics.',
  not_enrolled: 'Biometrics aren’t set up on this device.',
  weak_only: 'Your device’s biometrics don’t meet the security level required for payments.',
  error: 'Biometrics are unavailable right now.',
};

/**
 * Current biometric capability, re-checked when the app returns to the foreground
 * (the user may have just enrolled Face ID in Settings).
 */
export function useBiometricCapability(): BiometricCapability | null {
  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  useEffect(() => {
    let mounted = true;
    const check = () => getBiometricCapability().then((c) => mounted && setCapability(c));
    void check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void check());
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return capability;
}

/**
 * One call — `authorize(message)` — that resolves when the user is verified or
 * gives up. Decision tree:
 *
 *   biometrics available? ──yes──▶ OS prompt ──success──▶ ✅
 *        │                             ├─ "Use PIN" / lockout / un-enrolled ─▶ PIN
 *        │                             └─ cancel ─▶ ❌ cancelled
 *        no ──▶ PIN set? ──yes──▶ verify PIN    no ──▶ create PIN
 *
 * The PIN sheet is rendered by the caller via `pinModalProps`, and the promise is
 * resolved from its callbacks, so screens just `await authorize(...)`.
 */
export function useTransactionAuth() {
  // Kept after closing (open: false) so the sheet doesn't change title mid slide-out.
  const [pinRequest, setPinRequest] = useState<{ id: number; open: boolean; mode: PinMode; reason?: string }>({
    id: 0,
    open: false,
    mode: 'verify',
  });
  const resolverRef = useRef<((result: AuthResult) => void) | null>(null);

  const settle = useCallback((result: AuthResult) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setPinRequest((current) => ({ ...current, open: false }));
  }, []);

  // Never leave a caller awaiting forever if the screen unmounts mid-prompt.
  useEffect(() => () => resolverRef.current?.({ ok: false, reason: 'cancelled' }), []);

  const askForPin = useCallback(async (reason?: string): Promise<AuthResult> => {
    const mode: PinMode = (await pinService.hasPin()) ? 'verify' : 'create';
    return new Promise<AuthResult>((resolve) => {
      resolverRef.current = resolve;
      setPinRequest((current) => ({ id: current.id + 1, open: true, mode, reason }));
    });
  }, []);

  const authorize = useCallback(
    async (promptMessage: string): Promise<AuthResult> => {
      const capability = await getBiometricCapability();
      if (!capability.available) return askForPin(UNAVAILABLE_COPY[capability.reason]);

      const outcome = await authenticateWithBiometrics(promptMessage);
      switch (outcome.status) {
        case 'success':
          return { ok: true, method: 'biometric' };
        case 'cancelled':
          return { ok: false, reason: 'cancelled' };
        case 'fallback':
          return askForPin();
        case 'locked_out':
          return askForPin(`${capability.label} is locked after too many attempts. Use your PIN instead.`);
        case 'unavailable':
          return askForPin(`${capability.label} is no longer available. Use your PIN instead.`);
        case 'failed':
          return { ok: false, reason: 'failed', message: outcome.message };
      }
    },
    [askForPin],
  );

  const pinModalProps: PinModalProps = {
    visible: pinRequest.open,
    requestId: pinRequest.id,
    mode: pinRequest.mode,
    reason: pinRequest.reason,
    onSuccess: () => settle({ ok: true, method: 'pin' }),
    onCancel: () => settle({ ok: false, reason: 'cancelled' }),
    onLockedOut: (message) => settle({ ok: false, reason: 'locked_out', message }),
  };

  return { authorize, pinModalProps };
}
