// Design tokens. All styling flows from here — no hardcoded colours or
// spacing in components.
export const colors = {
  background: '#FFFFFF',
  surface: '#F6F5F2',
  primary: '#7B4B2A',
  primaryDark: '#5C3820',
  accent: '#E0A458',
  text: '#231A12',
  textMuted: '#6F6459',
  border: '#E4DED6',
  danger: '#B3261E',
  success: '#2E7D32',
  badge: '#B3261E',
  overlayScrim: 'rgba(0,0,0,0.35)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const type = {
  title: { fontSize: 22, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '400' },
  price: { fontSize: 16, fontWeight: '700' },
} as const;
