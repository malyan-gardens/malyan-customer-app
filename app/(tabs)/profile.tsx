import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black" edges={["bottom"]}>
      <View className="px-6 pt-4">
        <View className="items-center mb-10">
          <View className="w-24 h-24 rounded-full bg-brand/20 border-2 border-brand items-center justify-center mb-4">
            <Ionicons name="business" size={44} color="#1a7a3c" />
          </View>
          <Text className="text-white text-2xl font-bold text-center">
            ماليان للتجارة والحدائق
          </Text>
          <Text className="text-neutral-500 mt-2 text-center">
            نباتات اصطناعية — قطر
          </Text>
        </View>

        <View className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
          <Row
            icon="leaf-outline"
            label="من نحن"
            onPress={() => Linking.openURL("https://malyan.qa")}
          />
          <Row
            icon="call-outline"
            label="اتصل بنا"
            onPress={() => Linking.openURL("tel:+974")}
          />
          <Row
            icon="logo-instagram"
            label="إنستغرام"
            onPress={() => Linking.openURL("https://instagram.com")}
            last
          />
        </View>

        <Text className="text-neutral-600 text-xs text-center mt-10 px-4 leading-5">
          هذا التطبيق لعملاء ماليان. للاستفسارات حول الطلبات والتوصيل، تواصل مع فريق
          الخدمة.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between px-4 py-4 active:bg-neutral-800 ${
        !last ? "border-b border-neutral-800" : ""
      }`}
    >
      <Ionicons name="chevron-back" size={20} color="#6b7280" />
      <View className="flex-row items-center flex-1 justify-end gap-3">
        <Text className="text-white font-medium text-base">{label}</Text>
        <Ionicons name={icon} size={22} color="#1a7a3c" />
      </View>
    </Pressable>
  );
}
