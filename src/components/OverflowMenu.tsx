import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { colors, fonts, radius, shadow, space, touch } from '../lib/theme';

export type MenuItem = { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void };

// The three-dot button at the top right of a screen, with a short list of actions.
export default function OverflowMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} style={s.button}
        accessibilityRole="button" accessibilityLabel="More options">
        <Ionicons name="ellipsis-vertical" size={24} color={colors.primary} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close menu">
          <View style={s.menu}>
            {items.map((item) => (
              <Pressable key={item.label} style={s.item} accessibilityRole="menuitem"
                onPress={() => { setOpen(false); item.onPress(); }}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
                <Text style={s.label}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  button: { minWidth: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'flex-end', padding: space.lg, paddingTop: 56 },
  menu: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: space.xs, minWidth: 220, ...shadow.raised },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: touch.min + 4 },
  label: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
});
