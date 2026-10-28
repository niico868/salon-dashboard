import { useFonts } from 'expo-font';
import { F } from './theme';

// Loads every brand font once, at app start. Returns true when the app can draw.
// If a font fails to load, the app carries on with the phone's normal font rather than freezing.
export function useBrandFonts() {
  const [loaded, error] = useFonts({
    [F.script]: require('../../assets/fonts/GreatVibes-Regular.ttf'),        // greeting + toasts
    [F.title]: require('../../assets/fonts/PlayfairDisplay-SemiBold.ttf'),   // headings
    [F.titleBold]: require('../../assets/fonts/PlayfairDisplay-Bold.ttf'),   // titles, big numbers
    [F.body]: require('../../assets/fonts/Lato-Regular.ttf'),                // body text
    [F.bodyMedium]: require('../../assets/fonts/Lato-Medium.ttf'),
    [F.bodySemi]: require('../../assets/fonts/Lato-Semibold.ttf'),
    [F.bodyBold]: require('../../assets/fonts/Lato-Bold.ttf'),
  });
  if (error) console.warn('Brand fonts failed to load:', error.message);
  return loaded || !!error;
}
