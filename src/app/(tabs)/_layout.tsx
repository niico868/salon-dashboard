import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { C, F } from '../../lib/theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: C.primary,
      tabBarInactiveTintColor: C.muted,
      tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.border },
      tabBarLabelStyle: { fontFamily: F.body },
      headerTitleAlign: 'center',
      headerStyle: { backgroundColor: C.bg },
      headerTitleStyle: { fontFamily: F.title, color: C.ink, fontSize: 20 },
      headerShadowVisible: false,
      sceneStyle: { backgroundColor: C.bg },
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
