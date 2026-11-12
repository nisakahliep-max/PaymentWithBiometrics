import * as LocalAuthentication from 'expo-local-authentication';

import { authenticateWithBiometrics, biometricLabel, getBiometricCapability, mapBiometricError } from './biometricService';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  getEnrolledLevelAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
}));

const LA = jest.mocked(LocalAuthentication);

function device({ hardware = true, enrolled = true, types = [2] }: { hardware?: boolean; enrolled?: boolean; types?: number[] }) {
  LA.hasHardwareAsync.mockResolvedValue(hardware);
  LA.isEnrolledAsync.mockResolvedValue(enrolled);
  LA.supportedAuthenticationTypesAsync.mockResolvedValue(types as LocalAuthentication.AuthenticationType[]);
}

describe('getBiometricCapability (iOS)', () => {
  it('detects Face ID', async () => {
    device({ types: [2] });
    await expect(getBiometricCapability()).resolves.toEqual({ available: true, kind: 'face', label: 'Face ID' });
  });

  it('detects Touch ID', async () => {
    device({ types: [1] });
    await expect(getBiometricCapability()).resolves.toMatchObject({ kind: 'fingerprint', label: 'Touch ID' });
  });

  it('reports missing hardware and missing enrolment separately', async () => {
    device({ hardware: false, types: [] });
    await expect(getBiometricCapability()).resolves.toEqual({ available: false, reason: 'no_hardware' });
    device({ enrolled: false });
    await expect(getBiometricCapability()).resolves.toEqual({ available: false, reason: 'not_enrolled' });
  });

  it('never throws — native errors become "unavailable"', async () => {
    LA.hasHardwareAsync.mockRejectedValue(new Error('boom'));
    await expect(getBiometricCapability()).resolves.toEqual({ available: false, reason: 'error' });
  });
});

describe('mapBiometricError', () => {
  it.each([
    ['user_fallback', 'ios', 'fallback'],
    ['user_cancel', 'ios', 'cancelled'],
    ['user_cancel', 'android', 'fallback'],
    ['system_cancel', 'ios', 'cancelled'],
    ['lockout', 'ios', 'locked_out'],
    ['not_enrolled', 'ios', 'unavailable'],
    ['passcode_not_set', 'android', 'unavailable'],
    ['authentication_failed', 'ios', 'failed'],
    ['unknown', 'ios', 'failed'],
  ] as const)('%s on %s → %s', (error, os, status) => {
    expect(mapBiometricError(error, os).status).toBe(status);
  });
});

describe('authenticateWithBiometrics', () => {
  it('disables the device passcode fallback and uses the app PIN instead', async () => {
    LA.authenticateAsync.mockResolvedValue({ success: true });
    await expect(authenticateWithBiometrics('Authorise RM 10.00')).resolves.toEqual({ status: 'success' });
    expect(LA.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: 'Authorise RM 10.00', disableDeviceFallback: true, fallbackLabel: 'Use PIN' }),
    );
  });

  it('maps failures', async () => {
    LA.authenticateAsync.mockResolvedValue({ success: false, error: 'lockout' });
    await expect(authenticateWithBiometrics('x')).resolves.toEqual({ status: 'locked_out' });
  });
});

it('labels biometrics per platform', () => {
  expect(biometricLabel('face', 'android')).toBe('Face Unlock');
  expect(biometricLabel('fingerprint', 'android')).toBe('Fingerprint');
});
