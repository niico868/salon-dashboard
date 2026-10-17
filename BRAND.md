# Melt Aways brand: apply it across the app

This file is written for **Claude in VS Code** (or any developer). It has access to the whole
project; the brand kit only added new files. Read this whole file first, then do the steps in order.

## Rules

- **Change the look only.** Don't change data loading, saving, navigation or any business logic.
- **Take every colour, font, size and spacing from `src/lib/theme.ts`.** No hex codes or font names typed
  directly in screens. Replace the old `#C2185B`, `#FFF7FA`, `'#777'`, `'#eee'`, `'#2E7D32'` etc. with theme tokens.
- **No swipe actions.** The owner asked for none.
- **Alerts stay for questions and errors only** ("Delete client?", "Save failed"). Successful saves use a toast.
- Keep every animation short, and use the kit's components, which already respect Reduce Motion.
- Work one screen at a time. After each, the app must still run (`npx expo start --tunnel -c`).

## What the kit provides

| File | Use for |
| --- | --- |
| `src/lib/theme.ts` | `colors`, `fonts`, `type`, `space`, `radius`, `shadow`, `motion`, `brand` |
| `src/lib/fonts.ts` | `useBrandFonts()`: loads Great Vibes, Playfair Display, Lato |
| `src/lib/motion.ts` | `useReducedMotion()`, `haptic.tap/success/warning()` |
| `components/Typography.tsx` | `Greeting` (Great Vibes), `Title`, `Heading` (Playfair), `Body`, `BodyStrong`, `Label`, `Small` (Lato) |
| `components/Button.tsx` | `<Button title onPress variant="primary\|outline\|ghost\|danger" icon loading />` |
| `components/Field.tsx` | Labelled text box: `<Field label placeholder hint error required … />` |
| `components/Toast.tsx` | `ToastProvider` (root) and `useToast().show('Payment saved')` |
| `components/Skeleton.tsx` | `Skeleton`, `SkeletonCard`, `SkeletonList`: loading placeholders |
| `components/EmptyState.tsx` | Icon + message + one button for empty lists |
| `components/StatusChip.tsx` | Coloured status pills: booked, completed, paid, owes, pending, due, overdue, no_show, cancelled, website |
| `components/StatCard.tsx` | Dashboard number tile; `amount={n} format={TTD}` counts up. Old `value=` still works |
| `components/AnimatedNumber.tsx` | Count-up number on its own |
| `components/FadeInView.tsx` | Fade/slide-in; `index` staggers cards |
| `components/PressableScale.tsx` | Pressable that shrinks slightly when pressed |
| `components/GreetingHeader.tsx` | "Good morning, Krystal" + date + summary + logo mark |
| `components/Logo.tsx` | Full logo |
| `components/Screen.tsx` | Page wrapper with brand background and optional `onRefresh` |

## Steps

### 1. Root layout (`src/app/_layout.tsx`)
- Add `import * as SplashScreen from 'expo-splash-screen';`, call `SplashScreen.preventAutoHideAsync().catch(() => {})` once at module level.
- Call `useBrandFonts()`. Render nothing until both the session check and fonts are ready, then `SplashScreen.hideAsync()`.
- Wrap the returned `<Stack>` in `<ToastProvider>`.
- Give the Stack `screenOptions`: `headerStyle: { backgroundColor: colors.background }`, `headerShadowVisible: false`,
  `headerTintColor: colors.primary`, `headerTitleStyle: { fontFamily: fonts.heading, color: colors.text }`,
  `contentStyle: { backgroundColor: colors.background }`. Keep each screen's existing `options`.
- Keep everything else in this file (web-alert import, notifications, Stack.Protected groups) exactly as is.

### 2. Tab bar (`src/app/(tabs)/_layout.tsx`)
- `tabBarActiveTintColor: colors.primary`, `tabBarInactiveTintColor: colors.textMuted`,
  `tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border }`,
  `tabBarLabelStyle: { fontFamily: fonts.bodyMedium }`, header styled as in step 1.

### 3. Login: the kit's `src/app/login.tsx` is already in place (same sign-in logic; logo, "Melt Aways Spa Dashboard" title, branded fields). Don't change it.

### 4. Home dashboard (`src/app/(tabs)/index.tsx`)
- Put `<GreetingHeader summary="3 bookings today · TT$1,450 expected" />` at the top, built from today's data.
  Remove the old plain date heading.
- Money tiles: `<StatCard label amount={…} format={TTD} index={0..3} />` so they count up and arrive one by one.
- Section headings → `Heading`. Each section's card → `FadeInView` with increasing `index`.
- While the first load runs, show `SkeletonList` instead of empty sections.
- Empty "today" list → `EmptyState icon="calendar-outline" title="No bookings today" actionLabel="Book appointment"`.
- Each booking row: show a `StatusChip` (paid or `owes` with the amount; `website` if notes start with `[Website]`).
- Follow-ups: overdue → `StatusChip status="overdue"`; Done button → `Button variant="ghost"` and `toast.show('Follow-up done')`.
- Charts: received bars `colors.chartReceived`, still-due `colors.chartDue`, axis text `colors.textMuted`, labels in `fonts.body`.

### 5. Every other screen (calendar, day view, clients, client profile, client form, appointment, booking,
payment, services, sales, more, invoices, birthdays)
- Wrap in the kit's `Screen` (lists: add `onRefresh`). Headings → `Heading`/`Title`; text → `Body`/`Label`.
- Every `TextInput` with a label → `Field` with a real example placeholder (e.g. "e.g. 868 555 1234",
  "e.g. Prefers morning appointments") and a `hint` where useful. Mark required fields `required`.
- Every main action → `Button`; secondary → `variant="outline"`; delete → `variant="danger"`.
- Pressable rows and cards → `PressableScale`, white `colors.surface` cards with `radius.lg` and `shadow.card`.
- Appointment statuses everywhere → `StatusChip`. Calendar dots: booked `colors.primary`, completed `colors.success`,
  cancelled/no-show `colors.neutral`. Calendar theme: `todayTextColor` and `arrowColor` `colors.primary`,
  `selectedDayBackgroundColor` `colors.primary`, fonts from `fonts`.
- Lists: loading → `SkeletonList`; empty → `EmptyState` with a helpful action:
  clients "No clients yet / Add client", services "Your menu is empty / Add service" (behind the passcode),
  sales period with nothing → "No sales in this period".
- After every successful save, replace `router.back()`-only or "Saved" alerts with `toast.show(...)` then navigate:
  "Client saved", "Appointment booked", "Payment recorded", "Service updated", "Rescheduled", "Marked as done".
  Use `haptic.warning()` before destructive confirmations.

### 6. App icon and splash (`app.json`)
- `"icon": "./assets/images/icon.png"`, Android `adaptiveIcon.foregroundImage` `./assets/images/adaptive-icon.png`
  with `backgroundColor` `#FFF5F8`, web `favicon` `./assets/images/favicon.png`.
- Add plugin `["expo-splash-screen", { "image": "./assets/images/splash-icon.png", "imageWidth": 220, "backgroundColor": "#FFF8FA" }]`.
- Web app manifest (Part 13.3): regenerate `public/icon-192.png` and `public/icon-512.png` from the new `icon.png`,
  and set `theme_color` `#D51D5E`, `background_color` `#FFF8FA`.

### 7. Check
- Run on a phone and on web. Every screen uses brand fonts, no leftover old pinks, and nothing swipes.
- Turn on the phone's Reduce Motion: no animations, everything still appears.
- Make the phone's text size large: no text is cut off.

## Fonts

Great Vibes (script), Playfair Display (headings) and Lato (body) are all free for commercial use (SIL Open Font License).
