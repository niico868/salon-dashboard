import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, space } from '../lib/theme';
import { Body, Heading } from './Typography';
import Button from './Button';

// What to show when a list has nothing in it yet: an icon, a short message and one helpful button.
// <EmptyState icon="people-outline" title="No clients yet" message="Add your first client to start booking."
//   actionLabel="Add client" onAction={() => router.push('/client/new')} />
type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  return (
    <View style={s.wrap}>
      <View style={s.circle}><Ionicons name={icon} size={30} color={colors.primary} /></View>
      <Heading style={{ textAlign: 'center' }}>{title}</Heading>
      {message ? <Body style={{ textAlign: 'center', color: colors.textMuted }}>{message}</Body> : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} style={{ marginTop: space.sm, alignSelf: 'stretch' }} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.xl },
  circle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
});
