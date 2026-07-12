// Design tokens. All styling flows from here - no hardcoded colours or
// spacing in components.
//
// The palette is a warm bookshop: a cream canvas, cards a shade warmer than
// the canvas (they read as paper lifted off a table, helped by `shadows`),
// near-black for anything that takes a tap, and tan/blush/sage for the
// decorative pills. Nothing here is pure white or pure black.
export const colors = {
  background: '#F1EDE4', // cream canvas
  surface: '#FFF4E4', // card / raised paper
  cardDeep: '#EFE0CC', // the book-details hero panel, one step deeper
  primary: '#1F1D1A', // near-black - pill CTAs, primary text on cream
  primaryDark: '#0F0E0C', // pressed/darker variant of primary
  accent: '#E0A458', // gold - star ratings
  tan: '#DAC5A7', // tinted pills, avatar ring, stepper buttons
  blush: '#F3D9D5', // subject pill, variant 2
  sage: '#DDE2D5', // subject pill, variant 3
  text: '#231A12',
  textMuted: '#8A7F72',
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
  xl: 24, // hero panel
  pill: 999,
} as const;

// Font families, loaded in App.tsx. Referencing a family that never loaded
// silently falls back to the system font, so these two names and the useFonts
// map in App.tsx must stay in step.
export const fonts = {
  serif: 'Amiri_400Regular',
  serifBold: 'Amiri_700Bold',
} as const;

// Two families, two rules:
//
//   Serif tokens (display/title/heading/price) name a `fontFamily` and carry
//   NO `fontWeight` - Android picks the wrong face when you ask for a named
//   bold family AND a numeric weight, so weight lives in the family name.
//
//   Sans tokens (body/caption) are the reverse: system font, weight set here
//   or overridden at the call site. Body copy at 15px and buttons stay sans
//   because Amiri gets thin and hard to read at small sizes.
export const type = {
  display: { fontSize: 28, fontFamily: fonts.serifBold },
  title: { fontSize: 22, fontFamily: fonts.serifBold },
  heading: { fontSize: 18, fontFamily: fonts.serifBold },
  price: { fontSize: 16, fontFamily: fonts.serifBold },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '400' },
} as const;

// Soft, warm-tinted elevation. `shadowColor` is the text brown rather than
// black so shadows sit in the palette instead of greying the cream out.
export const shadows = {
  card: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  hero: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
