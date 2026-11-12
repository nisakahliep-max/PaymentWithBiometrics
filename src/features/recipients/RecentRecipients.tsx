import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Avatar } from '@/components/ui';
import { useRecentRecipients } from '@/features/history/historyStore';
import { colors, spacing, typography } from '@/theme/tokens';

import type { Recipient } from './types';

/**
 * Horizontal strip of the people you paid most recently — one tap to re-send.
 * Max 8 items, so a plain ScrollView is cheaper than a virtualised list here.
 */
function RecentRecipientsBase({
  selectedAccount,
  onSelect,
}: {
  selectedAccount?: string;
  onSelect: (recipient: Recipient) => void;
}) {
  const recents = useRecentRecipients();
  if (recents.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.container}>
      <Text style={styles.title}>Recent</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {recents.map((recipient) => {
          const selected = recipient.accountNumber === selectedAccount;
          return (
            <Pressable
              key={recipient.accountNumber}
              accessibilityRole="button"
              accessibilityLabel={`Send to ${recipient.name}`}
              accessibilityState={{ selected }}
              onPress={() => onSelect(recipient)}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <View style={[styles.ring, selected && styles.ringSelected]}>
                <Avatar name={recipient.name} size={48} />
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {recipient.name.split(' ')[0]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

export const RecentRecipients = memo(RecentRecipientsBase);

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: { ...typography.label, color: colors.inkMuted },
  row: { gap: spacing.lg, paddingRight: spacing.lg },
  item: { alignItems: 'center', width: 64, gap: spacing.xs },
  pressed: { opacity: 0.6 },
  ring: { padding: 2, borderRadius: 30, borderWidth: 2, borderColor: 'transparent' },
  ringSelected: { borderColor: colors.primary },
  name: { ...typography.caption, color: colors.ink },
});
