// AFTERCARE GUIDELINES PER TREATMENT
//
// Krystal fills in her points in the app (More -> Email marketing -> Aftercare by treatment), in
// her own words. Each line becomes one bullet in the aftercare email. The app's list of treatments
// comes from here, and this file must keep having no imports because the app reads it too.
//
// - A treatment is matched when its name in the app contains any of the `match` words (not case sensitive).
// - A treatment with no points just gets the general care section below.
// - After changing this file, redeploy: npx supabase functions deploy client-messages --no-verify-jwt
//
// Nothing here is medical advice written by the developer. Please only add guidance you are
// qualified to give and already share with clients.

export type Aftercare = { match: string[]; title: string; points: string[] };

export const AFTERCARE: Aftercare[] = [
  { match: ['cavitation'], title: 'Cavitation', points: [] },
  { match: ['fat dissolv', 'fat melt'], title: 'Fat dissolving', points: [] },
  { match: ['morpheus'], title: 'Morpheus 8', points: [] },
  { match: ['micro-needl', 'microneedl'], title: 'Microneedling', points: [] },
  { match: ['skin tight'], title: 'Skin tightening', points: [] },
  { match: ['lymphatic'], title: 'Lymphatic drainage', points: [] },
  { match: ['butt lift', 'butt fill', 'bbl'], title: 'Butt lift', points: [] },
  { match: ['breast'], title: 'Breast enhancement', points: [] },
  { match: ['stretch mark'], title: 'Stretch mark therapy', points: [] },
  { match: ['facial'], title: 'Facial', points: [] },
  { match: ['iv ', 'iv therapy', 'drip'], title: 'IV therapy', points: [] },
  { match: ['muscle', 'toning', 'sculpt'], title: 'Muscle toning', points: [] },
];

// General points every aftercare email includes. Safe, non-specific wording; edit freely.
export const GENERAL_AFTERCARE = [
  'Follow the aftercare advice your therapist gave you at your visit.',
  'Keep hydrated and give your body time to rest.',
  'If anything feels unusual or you have any concerns, contact us straight away. If it feels urgent, seek medical attention.',
];

// `saved` is what Krystal typed in the app: treatment title -> one point per line
export const pointsFromText = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

export function aftercareFor(serviceName: string, saved: Record<string, string> = {}): Aftercare | undefined {
  const name = ` ${serviceName.toLowerCase()} `;
  return AFTERCARE
    .map((a) => (typeof saved[a.title] === 'string' ? { ...a, points: pointsFromText(saved[a.title]) } : a))
    .find((a) => a.points.length && a.match.some((m) => name.includes(m)));
}
