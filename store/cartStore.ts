import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CartLine = {
  productId: string;
  name: string;
  nameAr?: string | null;
  price: number;
  currency: string;
  imageUrl?: string | null;
  quantity: number;
};

type CartState = {
  items: CartLine[];
  addItem: (line: Omit<CartLine, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (line) => {
        const qty = line.quantity ?? 1;
        const existing = get().items.find((i) => i.productId === line.productId);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.productId === line.productId
                ? { ...i, quantity: i.quantity + qty }
                : i
            ),
          });
        } else {
          set({
            items: [
              ...get().items,
              {
                productId: line.productId,
                name: line.name,
                nameAr: line.nameAr,
                price: line.price,
                currency: line.currency,
                imageUrl: line.imageUrl,
                quantity: qty,
              },
            ],
          });
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),
      setQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        });
      },
      clear: () => set({ items: [] }),
    }),
    {
      name: "malyan-cart",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export function cartTotal(items: CartLine[]) {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}
