import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cartTotal, useCartStore } from "../../store/cartStore";

export default function CartScreen() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const total = cartTotal(items);

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["bottom"]}>
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 120 }}>
        {items.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="cart-outline" size={64} color="#374151" />
            <Text className="text-neutral-500 mt-6 text-lg text-center">
              السلة فارغة
            </Text>
            <Text className="text-neutral-600 mt-2 text-center px-8">
              تصفح المتجر وأضف منتجاتك المفضلة
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/home")}
              className="mt-8 bg-brand px-8 py-3 rounded-xl"
            >
              <Text className="text-white font-bold">تصفح المنتجات</Text>
            </Pressable>
          </View>
        ) : (
          items.map((line) => {
            const title = line.nameAr ?? line.name;
            return (
              <View
                key={line.productId}
                className="flex-row bg-neutral-900 rounded-2xl border border-neutral-800 mb-3 overflow-hidden"
              >
                <View className="w-24 h-24 bg-neutral-800">
                  {line.imageUrl ? (
                    <Image
                      source={{ uri: line.imageUrl }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Ionicons name="leaf" size={32} color="#1a7a3c" />
                    </View>
                  )}
                </View>
                <View className="flex-1 p-3 justify-between">
                  <Text className="text-white font-semibold text-right" numberOfLines={2}>
                    {title}
                  </Text>
                  <Text className="text-brand text-right font-bold">
                    {(line.price * line.quantity).toFixed(2)} {line.currency}
                  </Text>
                  <View className="flex-row items-center justify-end gap-2 mt-2">
                    <Pressable
                      onPress={() => setQuantity(line.productId, line.quantity - 1)}
                      className="w-9 h-9 rounded-lg bg-neutral-800 items-center justify-center border border-neutral-700"
                    >
                      <Ionicons name="remove" size={18} color="#fff" />
                    </Pressable>
                    <Text className="text-white font-bold min-w-[28px] text-center">
                      {line.quantity}
                    </Text>
                    <Pressable
                      onPress={() => setQuantity(line.productId, line.quantity + 1)}
                      className="w-9 h-9 rounded-lg bg-brand items-center justify-center"
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                    </Pressable>
                    <Pressable
                      onPress={() => removeItem(line.productId)}
                      className="ml-2 p-2"
                    >
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {items.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-black border-t border-brand/40 px-4 pt-3 pb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-neutral-400">الإجمالي</Text>
            <Text className="text-white text-xl font-bold">
              {total.toFixed(2)} QAR
            </Text>
          </View>
          <Pressable className="bg-brand py-4 rounded-2xl items-center active:opacity-90">
            <Text className="text-white font-bold text-lg">إتمام الطلب</Text>
          </Pressable>
          <Pressable onPress={clear} className="mt-3 py-2 items-center">
            <Text className="text-neutral-500 text-sm">مسح السلة</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
