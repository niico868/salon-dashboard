import { Image, StyleSheet, View } from 'react-native';
import { format } from 'date-fns';
import { brand, colors, space } from '../lib/theme';
import { Body, Greeting, Label } from './Typography';
import FadeInView from './FadeInView';

const partOfDay = (h: number) => (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');

// Top of the Home screen: logo mark, "Good morning, Krystal", the date and a one-line summary.
export default function GreetingHeader({ summary }: { summary?: string }) {
  const now = new Date();
  return (
    <FadeInView style={s.wrap}>
      <View style={{ flex: 1, gap: 2 }}>
        <Greeting accessibilityRole="header">{partOfDay(now.getHours())}, {brand.ownerName}</Greeting>
        <Label>{format(now, 'EEEE d MMMM')}</Label>
        {summary ? <Body style={{ marginTop: space.xs }}>{summary}</Body> : null}
      </View>
      <View style={s.markCircle}>
        <Image source={require('../../assets/images/logo-mark.png')} style={s.mark} resizeMode="contain"
          accessibilityLabel={`${brand.name} logo`} />
      </View>
    </FadeInView>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm },
  markCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 26, height: 44 },
});
