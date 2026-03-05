import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const GREEN_DEEP = '#0d3b2c';
const GOLD = '#c9a227';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: '#4a4a4a',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e8f5ef' },
        tabBarLabelStyle: { fontFamily: 'System' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'اليوم',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'السجل',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'الملف',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
