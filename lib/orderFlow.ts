import * as Linking from "expo-linking";
import { CONTACT } from "./contact";
import type { CartLine } from "../store/cartStore";

export type SerializedOrderItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  lineTotal: number;
};

export function serializeOrderItems(items: CartLine[]): SerializedOrderItem[] {
  return items.map((i) => ({
    productId: i.productId,
    name: i.nameAr ?? i.name,
    quantity: i.quantity,
    unitPrice: i.price,
    currency: i.currency,
    lineTotal: i.price * i.quantity,
  }));
}

export function orderPrimaryLabel(items: CartLine[]): string {
  const first = items[0];
  return first?.nameAr ?? first?.name ?? "منتج";
}

export function buildOrderInvoiceMessage(input: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  items: SerializedOrderItem[];
  total: number;
  paymentLabel: string;
  statusLine: string;
}): string {
  const lines = input.items.map(
    (i) => `• ${i.name} ×${i.quantity} = ${i.lineTotal.toFixed(2)} ${i.currency}`
  );
  const coords =
    input.latitude != null && input.longitude != null
      ? `\nالإحداثيات: ${input.latitude.toFixed(6)}, ${input.longitude.toFixed(6)}`
      : "";
  return [
    `فاتورة طلب — مليان للحدائق`,
    ``,
    `رقم الطلب: ${input.orderId}`,
    `العميل: ${input.customerName}`,
    `الهاتف: ${input.customerPhone}`,
    `العنوان: ${input.address ?? "—"}${coords}`,
    ``,
    `العناصر:`,
    ...lines,
    ``,
    `الإجمالي: ${input.total.toFixed(2)} QAR`,
    `طريقة الدفع: ${input.paymentLabel}`,
    `الحالة: ${input.statusLine}`,
    ``,
    `شكراً لاختياركم مليان للحدائق`,
  ].join("\n");
}

/** Opens WhatsApp chat with Malyan with a pre-filled invoice (customer sends to shop). */
export async function openInvoiceWhatsAppToBusiness(message: string): Promise<void> {
  try {
    const digits = CONTACT.phoneTel.replace(/\D/g, "");
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    await Linking.openURL(url);
  } catch {
    // WhatsApp not available — silently skip.
  }
}
