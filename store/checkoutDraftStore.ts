import { create } from "zustand";
import type { CartLine } from "./cartStore";

export type CheckoutDraftState = {
  orderLines: CartLine[];
  fromDirectProduct: boolean;
  customerName: string;
  customerPhone: string;
  phoneNumber: string;
  notes: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;

  setCustomerStep: (data: {
    orderLines: CartLine[];
    fromDirectProduct: boolean;
    customerName: string;
    customerPhone: string;
    notes: string;
  }) => void;
  setLocationStep: (latitude: number, longitude: number, address: string) => void;
  setPhoneNumber: (phone: string) => void;
  reset: () => void;
};

const initial = {
  orderLines: [] as CartLine[],
  fromDirectProduct: false,
  customerName: "",
  customerPhone: "",
  phoneNumber: "",
  notes: "",
  latitude: null as number | null,
  longitude: null as number | null,
  address: null as string | null,
};

export const useCheckoutDraftStore = create<CheckoutDraftState>((set) => ({
  ...initial,
  setCustomerStep: (data) =>
    set({
      orderLines: data.orderLines,
      fromDirectProduct: data.fromDirectProduct,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      phoneNumber: data.customerPhone,
      notes: data.notes,
      latitude: null,
      longitude: null,
      address: null,
    }),
  setLocationStep: (latitude, longitude, address) =>
    set({ latitude, longitude, address }),
  setPhoneNumber: (phone) => set({ phoneNumber: phone }),
  reset: () => set(initial),
}));
