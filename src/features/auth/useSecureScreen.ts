import { usePreventScreenCapture } from 'expo-screen-capture';
import { Platform } from 'react-native';

/**
 * Blocks screenshots / screen recording while the screen is mounted (iOS & Android).
 * Chosen once per platform at module load, so the Rules of Hooks still hold;
 * on web (where the native API doesn't exist) it is a no-op.
 */
export const useSecureScreen: () => void = Platform.OS === 'web' ? () => {} : () => usePreventScreenCapture();
