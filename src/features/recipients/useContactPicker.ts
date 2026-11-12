import { Contact, ContactField, requestPermissionsAsync } from 'expo-contacts';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { isValidMyMobile, normalizeMyMobile } from './identifiers';

type Details = { fullName?: string | null; phones?: { label?: string; number?: string }[] | null };
const FIELDS = [ContactField.FULL_NAME, ContactField.PHONES] as const;

/** Let the user choose between several mobile numbers on one contact. */
function choosePhone(name: string, phones: string[]): Promise<string | null> {
  if (phones.length <= 1) return Promise.resolve(phones[0] ?? null);
  return new Promise((resolve) => {
    Alert.alert(`Which number for ${name}?`, undefined, [
      ...phones.slice(0, 3).map((phone) => ({ text: phone, onPress: () => resolve(phone) })),
      { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null) },
    ]);
  });
}

/**
 * Privacy-first contacts access: we open the *system* contact picker, so the app
 * only ever sees the one contact the user chooses — not the whole address book.
 * Permission is requested only if the platform needs it to read that contact.
 */
export function useContactPicker() {
  const [error, setError] = useState<string | null>(null);

  const pickMobileNumber = useCallback(async (): Promise<string | null> => {
    setError(null);
    try {
      const contact = await Contact.presentPicker();
      if (!contact) return null; // user closed the picker

      let details: Details;
      try {
        details = await contact.getDetails(FIELDS);
      } catch {
        const permission = await requestPermissionsAsync();
        if (!permission.granted) {
          setError('Allow BioPay to access contacts in Settings to pay someone from your contacts.');
          return null;
        }
        details = await contact.getDetails(FIELDS);
      }

      const mobiles = [
        ...new Set((details.phones ?? []).map((p) => normalizeMyMobile(p.number ?? '')).filter(isValidMyMobile)),
      ];
      if (mobiles.length === 0) {
        setError(`${details.fullName ?? 'This contact'} doesn’t have a Malaysian mobile number.`);
        return null;
      }
      return choosePhone(details.fullName ?? 'this contact', mobiles);
    } catch {
      setError('Couldn’t open your contacts. Please try again.');
      return null;
    }
  }, []);

  return { pickMobileNumber, error, clearError: () => setError(null) };
}
