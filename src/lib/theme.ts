// Melt Aways brand: colours taken from meltawaysspa.com's design system.
// Every colour, font, size and spacing in the app comes from here.

export const C = {
  primary: '#9D3438',     // muted rose-red used for buttons and links on the website
  primaryDeep: '#6E2427', // pressed / emphasis
  rose: '#E3B8B7',        // soft pink accents
  blush: '#F8E2E1',       // light pink fills (chips, highlights)
  cream: '#F9F2ED',       // soft cream cards and sections
  bg: '#FFFCF9',          // warm white page background
  ink: '#1D1A19',         // body text
  taupe: '#60514F',       // secondary text
  muted: '#6F605E',       // hints and labels (dark enough to read easily)
  border: '#EBDEDC',
  gold: '#996516',        // script accents (greeting), like the website
  green: '#2E7D32',       // money received
  danger: '#B00020',
};

// Font names, as loaded in src/lib/fonts.ts
export const F = {
  script: 'GreatVibes_400Regular',      // greeting and toasts
  title: 'PlayfairDisplay_600SemiBold', // screen titles and headings
  titleBold: 'PlayfairDisplay_700Bold',
  body: 'Lato_400Regular',
  bodyMedium: 'Lato_500Medium',
  bodySemi: 'Lato_600SemiBold',
  bodyBold: 'Lato_700Bold',
};

export const colors = {
  primary: C.primary,
  primaryDeep: C.primaryDeep,
  primaryBright: '#B8434A',
  rose: C.rose,
  blush: C.blush,
  cream: C.cream,
  background: C.bg,
  surface: '#FFFFFF',
  text: C.ink,
  textSoft: C.taupe,
  textMuted: C.muted,
  textOnPrimary: '#FFFFFF',
  placeholder: '#9A8B89',
  border: C.border,
  gold: C.gold,
  success: '#2E7D32',
  successBg: '#E6F2E6',
  warning: '#9A5B00',
  warningBg: '#FBEFD9',
  danger: C.danger,
  dangerBg: '#FBE4E6',
  neutral: '#6B6B6B',
  neutralBg: '#EFEDEC',
  chartReceived: '#2E7D32',
  chartDue: C.rose,
  overlay: 'rgba(29,26,25,0.45)',
};

export const fonts = {
  script: F.script,
  heading: F.title,
  title: F.titleBold,
  body: F.body,
  bodyMedium: F.bodyMedium,
  bodySemi: F.bodySemi,
  bodyBold: F.bodyBold,
};

// Sizes are a little larger than usual so everything is easy to read at a glance
export const type = {
  greeting: { fontFamily: fonts.script, fontSize: 40, lineHeight: 52, color: colors.gold },
  title: { fontFamily: fonts.title, fontSize: 26, lineHeight: 32, color: colors.text },
  heading: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 26, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 17, lineHeight: 24, color: colors.text },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 24, color: colors.text },
  label: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 20, color: colors.textMuted },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.textMuted },
  number: { fontFamily: fonts.title, fontSize: 24, lineHeight: 30, color: colors.text },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };
export const touch = { min: 48 };   // smallest comfortable tap target

export const shadow = {
  card: {
    shadowColor: '#6E2427', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  raised: {
    shadowColor: '#6E2427', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
};

export const motion = { fast: 150, normal: 260, stagger: 60, countUp: 700 };

export const brand = { name: 'Melt Aways', ownerName: 'Krystal' };

// Salon opening hours (24-hour clock). The day view counts free time inside these.
export const hours = { open: 10, close: 16 };
