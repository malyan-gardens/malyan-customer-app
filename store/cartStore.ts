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
  /** When set, cart quantity cannot exceed inventory */
  maxQuantity?: number | null;
  category?: string | null;
};

type CartState = {
  items: CartLine[];
  /** Total units across all lines (derive in UI with `items` for reactive updates). */
  cartCount: () => number;
  addItem: (line: Omit<CartLine, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  clearCart: () => void;
};

function clampQty(line: CartLine, qty: number): number {
  let q = qty;
  if (line.maxQuantity != null && line.maxQuantity >= 0) {
    q = Math.min(q, line.maxQuantity);
  }
  return Math.max(0, q);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      cartCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      addItem: (line) => {
        const qty = line.quantity ?? 1;
        const existing = get().items.find((i) => i.productId === line.productId);
        const maxQ = line.maxQuantity;
        if (existing) {
          let mergedMax = existing.maxQuantity;
          if (maxQ != null && maxQ >= 0) {
            mergedMax =
              mergedMax != null && mergedMax >= 0
                ? Math.min(mergedMax, maxQ)
                : maxQ;
          }
          const nextLine = { ...existing, maxQuantity: mergedMax };
          let newQty = existing.quantity + qty;
          newQty = clampQty(nextLine, newQty);
          if (newQty <= 0) {
            get().removeItem(line.productId);
            return;
          }
          set({
            items: get().items.map((i) =>
              i.productId === line.productId
                ? {
                    ...i,
                    quantity: newQty,
                    maxQuantity: mergedMax,
                    category: line.category ?? i.category,
                  }
                : i
            ),
          });
        } else {
          const initial = clampQty(
            {
              ...line,
              quantity: qty,
              maxQuantity: maxQ,
            } as CartLine,
            qty
          );
          if (initial <= 0) return;
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
                quantity: initial,
                maxQuantity: maxQ,
                category: line.category ?? null,
              },
            ],
          });
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),
      setQuantity: (productId, quantity) => {
        const item = get().items.find((i) => i.productId === productId);
        if (!item) return;
        const q = clampQty(item, quantity);
        if (q <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity: q } : i
          ),
        });
      },
      clear: () => set({ items: [] }),
      clearCart: () => set({ items: [] }),
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
