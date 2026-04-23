export const QATAR_COUNTRY_CODE = "+974";
export const QATAR_PHONE_REGEX = /^\+974\d{8}$/;

export function normalizeQatarPhone(input: string | null | undefined): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 11 && digits.startsWith("974")) {
    return `${QATAR_COUNTRY_CODE}${digits.slice(-8)}`;
  }
  if (digits.length === 8) {
    return `${QATAR_COUNTRY_CODE}${digits}`;
  }
  return "";
}

export function extractQatarPhoneDigits(input: string | null | undefined): string {
  return normalizeQatarPhone(input).replace(QATAR_COUNTRY_CODE, "");
}

export function isValidQatarPhone(input: string | null | undefined): boolean {
  return QATAR_PHONE_REGEX.test(String(input ?? "").trim());
}

export type CustomerOrderStatus =
  | "pending"
  | "pending_cash"
  | "pending_payment"
  | "paid"
  | "processing"
  | "delivered"
  | "cancelled"
  | "refund_requested";

export function orderStatusLabelAr(status: string | null | undefined): string {
  const value = String(status ?? "").trim().toLowerCase();
  if (value === "processing") return "قيد التسليم";
  if (value === "delivered") return "تم التسليم";
  if (value === "cancelled") return "ملغي";
  if (value === "refund_requested") return "طلب استرجاع";
  return "طلب جديد";
}

export function canCancelAsNewOrder(status: string | null | undefined): boolean {
  const value = String(status ?? "").trim().toLowerCase();
  return (
    value === "pending" ||
    value === "pending_cash" ||
    value === "pending_payment" ||
    value === "paid"
  );
}
