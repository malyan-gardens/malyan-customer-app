import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#000000" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "700" },
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopColor: "#1a7a3c",
          borderTopWidth: 1,
          paddingTop: Platform.OS === "ios" ? 4 : 0,
          height: Platform.OS === "ios" ? 88 : 64,
        },
        tabBarActiveTintColor: "#1a7a3c",
        tabBarInactiveTintColor: "#6b7280",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "المتجر",
          tabBarLabel: "الرئيسية",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "سلة التسوق",
          tabBarLabel: "السلة",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "حسابي",
          tabBarLabel: "حسابي",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
