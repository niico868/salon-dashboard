// Melt Aways brand theme: the ONE place colours, fonts, sizes and motion live.
// Every screen should take its look from here instead of typing colours or fonts directly.

export const brand = {
  name: 'Melt Aways',
  appName: 'Melt Aways Spa Dashboard',
  tagline: 'Where we destroy fat and reveal the you inside',
  ownerName: 'Krystal',
};

export const colors = {
  // From the logo
  primary: '#D51D5E',        // deep pink: figure and "Melt"
  primaryBright: '#E1347B',  // bright pink: "AWAYS" and butterflies
  primaryPressed: '#B0164D',

  // Light tones built from the pinks
  background: '#FFF8FA',     // page background
  surface: '#FFFFFF',        // cards
  blush: '#FCE7EF',          // soft highlight: selected chips, icon circles
  blushStrong: '#F7C9DA',
  border: '#F2D9E3',

  // Text
  text: '#2B1420',           // deep plum, softer than black
  textMuted: '#7B6470',
  textOnPrimary: '#FFFFFF',
  placeholder: '#B8A3AD',

  // Status: fixed meanings, used everywhere
  success: '#23774F', successBg: '#E3F3EA',   // paid, done
  warning: '#A55F00', warningBg: '#FFF0D9',   // owes, due soon
  danger:  '#C2283B', dangerBg:  '#FDE6E9',   // overdue, no-show, errors
  neutral: '#6E676B', neutralBg: '#F0ECEE',   // cancelled

  // Charts
  chartReceived: '#D51D5E',
  chartDue: '#F5B8CF',
  chartGrid: '#F3E6EB',
};

// Font family names, as registered in src/lib/fonts.ts. All three are free for commercial use.
export const fonts = {
  script: 'GreatVibes',         // greeting + toast messages
  title: 'Playfair-Bold',       // screen titles, big numbers
  heading: 'Playfair-SemiBold', // section and card headings
  body: 'Lato-Regular',
  bodyMedium: 'Lato-Medium',
  bodyBold: 'Lato-Semibold',
};

export const type = {
  greeting: { fontFamily: fonts.script, fontSize: 34, color: colors.primary },
  title:    { fontFamily: fonts.title, fontSize: 26, color: colors.text },
  heading:  { fontFamily: fonts.heading, fontSize: 19, color: colors.text },
  number:   { fontFamily: fonts.title, fontSize: 22, color: colors.text },
  body:     { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.text },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  label:    { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
  small:    { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
export const touch = { min: 44 }; // smallest comfortable tap target

export const shadow = {
  card: {
    shadowColor: '#D51D5E', shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
};

// Motion: short and calm. Everything checks the phone's Reduce Motion setting (src/lib/motion.ts).
export const motion = { fast: 150, normal: 250, countUp: 700, stagger: 60 };
