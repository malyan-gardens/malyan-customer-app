import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const GOLD = '#c9a227';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: '#4a4a4a',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e8f5ef' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'الرئيسية', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="catalog" options={{ title: 'الكتالوج', tabBarIcon: ({ color, size }) => <Ionicons name="leaf" size={size} color={color} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'طلباتي', tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'الملف', tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
    </Tabs>
  );
}
