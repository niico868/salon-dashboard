import { Image, ImageStyle, StyleProp } from 'react-native';
import { brand } from '../lib/theme';

// The full Melt Aways logo (figure + wordmark). Width sets the size; height follows the logo's shape.
export default function Logo({ width = 220, style }: { width?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={require('../../assets/images/logo.png')}
      style={[{ width, height: width * (557 / 957) }, style]}
      resizeMode="contain"
      accessibilityLabel={`${brand.name} logo`}
    />
  );
}
