import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { ErrorBanner } from '@/components/ui';
import { classifyIdentifier } from '@/features/recipients/identifiers';
import { NewRecipientLookup } from '@/features/recipients/NewRecipientLookup';
import { RecipientRow } from '@/features/recipients/RecipientRow';
import { useRecipientsStore } from '@/features/recipients/recipientsStore';
import type { Recipient } from '@/features/recipients/types';
import { useContactPicker } from '@/features/recipients/useContactPicker';
import { useTransferDraftStore } from '@/features/transfer/transferDraftStore';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme/tokens';

function matches(recipient: Recipient, query: string, digits: string): boolean {
  return (
    recipient.name.toLowerCase().includes(query) ||
    recipient.bankName.toLowerCase().includes(query) ||
    (digits.length >= 3 && recipient.accountNumber.includes(digits))
  );
}

/**
 * One search box handles every way to choose a recipient:
 *   - type a name/bank → filters 1,000 saved recipients (FlashList)
 *   - type a mobile/account number → live name enquiry for a new recipient
 *   - tap "Choose from contacts" → system picker fills in the number
 */
export default function RecipientsScreen() {
  const router = useRouter();
  const { saved, status, error, load } = useRecipientsStore(
    useShallow((s) => ({ saved: s.saved, status: s.status, error: s.error, load: s.load })),
  );
  const selectRecipient = useTransferDraftStore((s) => s.selectRecipient);
  const { pickMobileNumber, error: contactError, clearError } = useContactPicker();

  const [query, setQuery] = useState('');
  // Keeps typing responsive: filtering 1,000 rows is rendered at lower priority.
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return saved;
    const digits = q.replace(/\D/g, '');
    return saved.filter((r) => matches(r, q, digits));
  }, [saved, deferredQuery]);

  const identifier = useMemo(() => classifyIdentifier(query), [query]);

  const select = useCallback(
    (recipient: Recipient) => {
      selectRecipient(recipient);
      router.back();
    },
    [router, selectRecipient],
  );

  const fromContacts = useCallback(async () => {
    const number = await pickMobileNumber();
    if (number) setQuery(number);
  }, [pickMobileNumber]);

  const renderItem: ListRenderItem<Recipient> = useCallback(
    ({ item }) => <RecipientRow recipient={item} onPress={select} />,
    [select],
  );

  const header = (
    <View>
      {identifier ? (
        <NewRecipientLookup
          key={`${identifier.channel}:${identifier.value}`}
          channel={identifier.channel}
          value={identifier.value}
          onSelect={select}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => void fromContacts()}
        style={({ pressed }) => [styles.contactsRow, pressed && styles.pressed]}
      >
        <View style={styles.contactsIcon}>
          <Ionicons name="people-outline" size={20} color={colors.primary} />
        </View>
        <Text style={styles.contactsText}>Choose from contacts</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.inkSubtle} />
      </Pressable>
      {contactError ? (
        <View style={styles.banner}>
          <ErrorBanner title="Contacts" message={contactError} tone="warning" actionLabel="Dismiss" onAction={clearError} />
        </View>
      ) : null}
      {filtered.length > 0 ? (
        <Text style={styles.sectionTitle}>Saved recipients ({filtered.length.toLocaleString()})</Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.inkSubtle} />
        <TextInput
          testID="recipient-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Name, mobile or account number"
          placeholderTextColor={colors.inkSubtle}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          returnKeyType="search"
          accessibilityLabel="Search recipients or enter a mobile or account number"
          style={styles.searchInput}
        />
      </View>

      {status === 'loading' && saved.length === 0 ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : status === 'error' && error ? (
        <View style={styles.banner}>
          <ErrorBanner title={error.title} message={error.message} actionLabel="Try again" onAction={() => void load()} />
        </View>
      ) : (
        <FlashList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ItemSeparatorComponent={Separator}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            identifier ? null : (
              <Text style={styles.empty}>
                No saved recipients match “{deferredQuery}”.{'\n'}Type a mobile or account number to pay someone new.
              </Text>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.ink, paddingVertical: spacing.md },
  loader: { marginTop: spacing.xxl },
  banner: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  contactsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.6 },
  contactsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactsText: { ...typography.heading, color: colors.primary, flex: 1 },
  sectionTitle: {
    ...typography.label,
    color: colors.inkMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  empty: { ...typography.body, color: colors.inkMuted, textAlign: 'center', padding: spacing.xl },
});
