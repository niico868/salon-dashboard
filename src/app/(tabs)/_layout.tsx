import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '../../lib/theme';

type Icon = keyof typeof Ionicons.glyphMap;
const icon = (on: Icon, off: Icon) => ({ color, focused }: { color: string; focused: boolean }) =>
  <Ionicons name={focused ? on : off} color={color} size={26} />;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 66 + insets.bottom,
        paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8) },
      tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 13 },
      headerTitleAlign: 'center',
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { fontFamily: fonts.heading, color: colors.text, fontSize: 22 },
      headerShadowVisible: false,
      sceneStyle: { backgroundColor: colors.background },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false, tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: icon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients', tabBarIcon: icon('people', 'people-outline') }} />
      <Tabs.Screen name="sales" options={{ title: 'Sales', tabBarIcon: icon('cash', 'cash-outline') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('ellipsis-horizontal-circle', 'ellipsis-horizontal-circle-outline') }} />
    </Tabs>
  );
}
