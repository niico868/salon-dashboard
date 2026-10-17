import { useFonts } from 'expo-font';
import { GreatVibes_400Regular } from '@expo-google-fonts/great-vibes';

// Loads every brand font once, at app start. Returns true when the app can draw.
// If a font fails to load, the app carries on with the phone's normal font rather than freezing.
export function useBrandFonts() {
  const [loaded, error] = useFonts({
    'GreatVibes': GreatVibes_400Regular,                                      // greeting + toasts
    'Playfair-SemiBold': require('../../assets/fonts/PlayfairDisplay-SemiBold.ttf'), // headings
    'Playfair-Bold': require('../../assets/fonts/PlayfairDisplay-Bold.ttf'),         // titles, big numbers
    'Lato-Regular': require('../../assets/fonts/Lato-Regular.ttf'),                  // body text
    'Lato-Medium': require('../../assets/fonts/Lato-Medium.ttf'),
    'Lato-Semibold': require('../../assets/fonts/Lato-Semibold.ttf'),
  });
  if (error) console.warn('Brand fonts failed to load:', error.message);
  return loaded || !!error;
}
