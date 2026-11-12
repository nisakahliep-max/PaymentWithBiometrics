/**
 * Design tokens — the single source of truth for colours, spacing and type.
 * Components never hard-code these values, so a re-brand is a one-file change.
 */
export const colors = {
  primary: '#0E7C66',
  primaryPressed: '#0A5E4D',
  primarySoft: '#E3F4EF',
  ink: '#0F172A',
  inkMuted: '#64748B',
  inkSubtle: '#94A3B8',
  background: '#F4F6F8',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  warning: '#B45309',
  warningSoft: '#FFFBEB',
  success: '#16A34A',
  successSoft: '#F0FDF4',
  overlay: 'rgba(15, 23, 42, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '400' },
} as const;

/** Minimum touch target recommended by Apple HIG / Material (44–48pt). */
export const TOUCH_TARGET = 48;
