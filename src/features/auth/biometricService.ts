import * as LocalAuthentication from 'expo-local-authentication';
import type { LocalAuthenticationError } from 'expo-local-authentication';
import { Platform } from 'react-native';

export type BiometricKind = 'face' | 'fingerprint' | 'iris';

export type BiometricUnavailableReason = 'no_hardware' | 'not_enrolled' | 'weak_only' | 'error';

export type BiometricCapability =
  | { available: true; kind: BiometricKind; label: string }
  | { available: false; reason: BiometricUnavailableReason };

/**
 * Normalised result of a biometric prompt. Callers switch on `status`
 * instead of dealing with 14 platform error codes.
 */
export type BiometricOutcome =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'fallback' }
  | { status: 'locked_out' }
  | { status: 'unavailable' }
  | { status: 'failed'; message: string };

export function biometricLabel(kind: BiometricKind, os: typeof Platform.OS = Platform.OS): string {
  if (os === 'ios') return kind === 'face' ? 'Face ID' : 'Touch ID';
  if (kind === 'face') return 'Face Unlock';
  if (kind === 'iris') return 'Iris';
  return 'Fingerprint';
}

/**
 * Checks hardware, enrolment and (on Android) strength. We require *strong*
 * (Class 3) biometrics on Android for payments — many devices offer camera-based
 * "weak" face unlock that can be fooled by a photo.
 */
export async function getBiometricCapability(): Promise<BiometricCapability> {
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    if (!hasHardware || types.length === 0) return { available: false, reason: 'no_hardware' };
    if (!isEnrolled) return { available: false, reason: 'not_enrolled' };

    if (Platform.OS === 'android') {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (level < LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG) {
        return { available: false, reason: 'weak_only' };
      }
    }

    const kind: BiometricKind = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
      ? 'face'
      : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ? 'fingerprint'
        : 'iris';
    return { available: true, kind, label: biometricLabel(kind) };
  } catch {
    return { available: false, reason: 'error' };
  }
}

export function mapBiometricError(
  error: LocalAuthenticationError,
  os: typeof Platform.OS = Platform.OS,
): BiometricOutcome {
  switch (error) {
    case 'user_fallback':
      return { status: 'fallback' };
    case 'user_cancel':
      // On Android the negative button is labelled "Use PIN instead" (Android has
      // no separate fallback button when device credentials are disabled).
      return os === 'android' ? { status: 'fallback' } : { status: 'cancelled' };
    case 'system_cancel':
    case 'app_cancel':
      return { status: 'cancelled' };
    case 'lockout':
      return { status: 'locked_out' };
    case 'not_enrolled':
    case 'not_available':
    case 'passcode_not_set':
      return { status: 'unavailable' };
    case 'authentication_failed':
      return { status: 'failed', message: 'We couldn’t verify it’s you. Please try again.' };
    default:
      return { status: 'failed', message: 'The biometric check couldn’t be completed. Please try again.' };
  }
}

/**
 * Shows the OS biometric sheet. `disableDeviceFallback` is deliberate: the device
 * passcode is often known by family members, so the fallback is our own
 * transaction PIN instead (see pinService).
 */
export async function authenticateWithBiometrics(promptMessage: string): Promise<BiometricOutcome> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      promptSubtitle: 'Confirm it’s you to authorise this transfer',
      cancelLabel: Platform.OS === 'android' ? 'Use PIN instead' : 'Cancel',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: true,
      biometricsSecurityLevel: 'strong',
      requireConfirmation: true,
    });
    return result.success ? { status: 'success' } : mapBiometricError(result.error);
  } catch {
    return { status: 'failed', message: 'The biometric check couldn’t be started. Please try again.' };
  }
}
