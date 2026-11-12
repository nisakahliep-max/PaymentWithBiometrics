import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/theme/tokens';

import { PinPad } from './PinPad';
import { PIN_LENGTH, pinService, validateNewPin } from './pinService';

export type PinMode = 'verify' | 'create';

interface PinSheetProps {
  mode: PinMode;
  /** Why we are asking for a PIN (e.g. "Biometrics aren't set up on this device"). */
  reason?: string;
  onSuccess: () => void;
  onCancel: () => void;
  onLockedOut: (message: string) => void;
}

export interface PinModalProps extends PinSheetProps {
  visible: boolean;
  /** Changes on every new request so the sheet remounts with fresh state. */
  requestId: number;
}

const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/**
 * Bottom-sheet PIN prompt. Keyed by `requestId` so each prompt starts clean
 * (no stale digits or errors from a previous attempt) without effect-based resets.
 */
export function PinModal({ visible, requestId, ...sheetProps }: PinModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={sheetProps.onCancel}>
      <View style={styles.backdrop}>
        <PinSheet key={requestId} {...sheetProps} />
      </View>
    </Modal>
  );
}

/**
 * Two flows:
 *  - verify: enter existing PIN (attempt-limited, persisted lockout)
 *  - create: enter + confirm a new PIN (first-time fallback setup)
 */
function PinSheet({ mode, reason, onSuccess, onCancel, onLockedOut }: PinSheetProps) {
  const [pin, setPin] = useState('');
  const [firstEntry, setFirstEntry] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.get() }] }));

  const reject = (message: string) => {
    setError(message);
    setPin('');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shakeX.set(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      ),
    );
  };

  const handleCreate = async (entered: string) => {
    if (firstEntry === null) {
      const problem = validateNewPin(entered);
      if (problem) return reject(problem);
      setFirstEntry(entered);
      setPin('');
      return;
    }
    if (entered !== firstEntry) {
      setFirstEntry(null);
      return reject('PINs didn’t match. Let’s start again.');
    }
    setBusy(true);
    try {
      await pinService.setPin(entered);
      onSuccess();
    } catch (e) {
      setBusy(false);
      setFirstEntry(null);
      reject(e instanceof Error ? e.message : 'Couldn’t save your PIN. Please try again.');
    }
  };

  const handleVerify = async (entered: string) => {
    setBusy(true);
    const result = await pinService.verifyPin(entered);
    setBusy(false);
    switch (result.status) {
      case 'ok':
        return onSuccess();
      case 'wrong':
        return reject(
          `Incorrect PIN. ${result.attemptsLeft} ${result.attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`,
        );
      case 'locked':
        return onLockedOut(`Too many incorrect PIN attempts. Try again after ${formatTime(result.retryAt)}.`);
      case 'not_set':
        return reject('No PIN is set up on this device.');
    }
  };

  const handleChange = (next: string) => {
    setPin(next);
    if (error) setError(null);
    if (next.length < PIN_LENGTH) return;
    void (mode === 'create' ? handleCreate(next) : handleVerify(next));
  };

  const title =
    mode === 'verify' ? 'Enter your transaction PIN' : firstEntry === null ? 'Create a transaction PIN' : 'Confirm your PIN';

  return (
    <SafeAreaView edges={['bottom']} style={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {firstEntry === null && reason ? <Text style={styles.reason}>{reason}</Text> : null}
      {mode === 'create' && firstEntry === null ? (
        <Text style={styles.reason}>You’ll use it to authorise transfers when biometrics aren’t available.</Text>
      ) : null}

      <Animated.View style={shakeStyle}>
        <PinPad length={PIN_LENGTH} value={pin} onChange={handleChange} disabled={busy} />
      </Animated.View>

      <View style={styles.status}>
        {busy ? (
          <ActivityIndicator color={colors.primary} />
        ) : error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </View>

      <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel} hitSlop={12}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg * 1.5,
    borderTopRightRadius: radius.lg * 1.5,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.sm },
  title: { ...typography.title, color: colors.ink, textAlign: 'center' },
  reason: { ...typography.body, color: colors.inkMuted, textAlign: 'center' },
  status: { minHeight: 24, justifyContent: 'center' },
  error: { ...typography.body, color: colors.danger, textAlign: 'center' },
  cancel: { paddingVertical: spacing.md, marginBottom: spacing.sm },
  cancelText: { ...typography.heading, color: colors.primary },
});
