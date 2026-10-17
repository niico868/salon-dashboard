import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../lib/theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerTitleAlign: 'center',
      headerStyle: { backgroundColor: colors.background },
      headerShadowVisible: false,
      headerTintColor: colors.primary,
      headerTitleStyle: { fontFamily: fonts.heading, color: colors.text },
      sceneStyle: { backgroundColor: colors.background },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      tabBarLabelStyle: { fontFamily: fonts.bodyMedium },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home',
        tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar',
        tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} /> }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients',
        tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} /> }} />
      <Tabs.Screen name="sales" options={{ title: 'Sales',
        tabBarIcon: ({ color, size }) => <Ionicons name="cash" color={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More',
        tabBarIcon: ({ color, size }) => <Ionicons name="menu" color={color} size={size} /> }} />
    </Tabs>
  );
}
