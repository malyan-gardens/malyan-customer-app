import { supabase } from "./supabase";

export type PromotionType =
  | "percentage"
  | "buy2get1"
  | "buy3pay2"
  | "min_order"
  | "flash"
  | "product_specific";

export type Promotion = {
  id: string;
  title: string;
  description: string | null;
  type: PromotionType;
  discount_value: number;
  min_order_amount: number;
  target_product_id: string | null;
  target_category: string | null;
  applies_to: "all" | "category" | "product";
  end_date: string | null;
  is_active: boolean;
};

export type CartItemForDiscount = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category?: string | null;
};

export type DiscountResult = {
  originalTotal: number;
  discountAmount: number;
  finalTotal: number;
  appliedPromotion: Promotion | null;
  discountLabel: string;
};

const PROMO_TYPES: PromotionType[] = [
  "percentage",
  "buy2get1",
  "buy3pay2",
  "min_order",
  "flash",
  "product_specific",
];

function normalizePromotionType(raw: unknown): PromotionType {
  const s = String(raw ?? "").toLowerCase().trim();
  if (PROMO_TYPES.includes(s as PromotionType)) return s as PromotionType;
  return "percentage";
}

function normalizeAppliesTo(raw: unknown): "all" | "category" | "product" {
  const s = String(raw ?? "all").toLowerCase().trim();
  if (s === "category") return "category";
  if (s === "product") return "product";
  return "all";
}

function mapRow(r: Record<string, unknown>): Promotion {
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? "عرض").trim() || "عرض",
    description: r.description != null ? String(r.description) : null,
    type: normalizePromotionType(r.type),
    discount_value: Number(r.discount_value ?? 0),
    min_order_amount: Number(r.min_order_amount ?? 0),
    target_product_id:
      r.target_product_id != null && String(r.target_product_id).length > 0
        ? String(r.target_product_id)
        : null,
    target_category:
      r.target_category != null && String(r.target_category).length > 0
        ? String(r.target_category)
        : null,
    applies_to: normalizeAppliesTo(r.applies_to),
    end_date: r.end_date != null ? String(r.end_date) : null,
    is_active: Boolean(r.is_active),
  };
}

function isPromotionStillValid(p: Promotion, now: number): boolean {
  if (!p.is_active) return false;
  if (!p.end_date) return true;
  const t = Date.parse(p.end_date);
  return !Number.isNaN(t) && t >= now;
}

function lineEligible(item: CartItemForDiscount, p: Promotion): boolean {
  if (p.type === "product_specific") {
    return (
      p.target_product_id != null && item.productId === p.target_product_id
    );
  }
  if (p.applies_to === "all") return true;
  if (p.applies_to === "category") {
    return (
      p.target_category != null &&
      item.category != null &&
      item.category === p.target_category
    );
  }
  if (p.applies_to === "product") {
    return (
      p.target_product_id != null && item.productId === p.target_product_id
    );
  }
  return true;
}

function eligibleItems(items: CartItemForDiscount[], p: Promotion): CartItemForDiscount[] {
  return items.filter((i) => lineEligible(i, p));
}

function subtotal(lines: CartItemForDiscount[]): number {
  return lines.reduce((s, i) => s + i.price * i.quantity, 0);
}

/** Buy 2 get 1 / buy 3 pay 2: every 3 units, cheapest in each triple is free. */
function bundleFreeDiscount(eligible: CartItemForDiscount[]): number {
  const units: number[] = [];
  for (const line of eligible) {
    for (let q = 0; q < line.quantity; q += 1) {
      units.push(line.price);
    }
  }
  if (units.length < 3) return 0;
  units.sort((a, b) => a - b);
  let discount = 0;
  for (let i = 0; i + 2 < units.length; i += 3) {
    discount += units[i];
  }
  return discount;
}

function percentOff(sub: number, pct: number): number {
  if (sub <= 0 || pct <= 0) return 0;
  return (sub * pct) / 100;
}

function computeDiscountForPromotion(
  items: CartItemForDiscount[],
  originalTotal: number,
  p: Promotion
): number {
  const pct = Math.max(0, p.discount_value);

  switch (p.type) {
    case "percentage":
    case "flash": {
      const el = eligibleItems(items, p);
      const sub = subtotal(el);
      return percentOff(sub, pct);
    }
    case "product_specific": {
      const el = eligibleItems(items, p);
      if (el.length === 0) return 0;
      const sub = subtotal(el);
      return percentOff(sub, pct);
    }
    case "min_order": {
      const minAmt = p.min_order_amount;
      if (minAmt <= 0 || originalTotal < minAmt) return 0;
      return percentOff(originalTotal, pct);
    }
    case "buy2get1":
    case "buy3pay2": {
      const el = eligibleItems(items, p);
      return bundleFreeDiscount(el);
    }
    default:
      return 0;
  }
}

function buildDiscountLabel(p: Promotion): string {
  const title = p.title;
  const x = Math.round(p.discount_value * 100) / 100;
  const y = Math.round(p.min_order_amount * 100) / 100;

  switch (p.type) {
    case "percentage":
    case "flash":
      return `خصم ${x}% - ${title}`;
    case "buy2get1":
      return `اشترِ 2 واحصل على 1 مجاناً - ${title}`;
    case "buy3pay2":
      return `اشترِ 3 وادفع ثمن 2 - ${title}`;
    case "min_order":
      return `خصم ${x}% عند الشراء فوق ${y} ريال`;
    case "product_specific":
      return `خصم ${x}% على المنتج - ${title}`;
    default:
      return title;
  }
}

export async function getActivePromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const now = Date.now();
  return (data as Record<string, unknown>[])
    .map(mapRow)
    .filter((p) => p.id.length > 0 && isPromotionStillValid(p, now));
}

export function calculateBestDiscount(
  items: CartItemForDiscount[],
  promotions: Promotion[]
): DiscountResult {
  const originalTotal = subtotal(items);

  if (items.length === 0 || originalTotal <= 0) {
    return {
      originalTotal: 0,
      discountAmount: 0,
      finalTotal: 0,
      appliedPromotion: null,
      discountLabel: "",
    };
  }

  const now = Date.now();
  let bestAmount = 0;
  let bestPromo: Promotion | null = null;

  for (const p of promotions) {
    if (!isPromotionStillValid(p, now)) continue;
    const d = computeDiscountForPromotion(items, originalTotal, p);
    if (d > bestAmount + 1e-6) {
      bestAmount = d;
      bestPromo = p;
    }
  }

  const finalTotal = Math.max(0, originalTotal - bestAmount);
  const discountLabel =
    bestPromo && bestAmount > 0 ? buildDiscountLabel(bestPromo) : "";

  return {
    originalTotal,
    discountAmount: bestAmount,
    finalTotal,
    appliedPromotion: bestPromo,
    discountLabel,
  };
}

/** Hero banner badge copy (Arabic) by promotion type */
export function heroPromotionBadge(p: {
  type: PromotionType;
  discount_value: number;
  min_order_amount: number;
}): string {
  const x = Math.round(p.discount_value * 100) / 100;
  const y = Math.round(p.min_order_amount * 100) / 100;
  switch (p.type) {
    case "buy2get1":
      return "اشترِ 2 + 1 مجاناً 🎁";
    case "buy3pay2":
      return "اشترِ 3 وادفع 2 💰";
    case "percentage":
    case "flash":
      return `خصم ${x}% ⚡`;
    case "min_order":
      return `وفّر عند ${y} ريال 🛒`;
    case "product_specific":
      return "عرض خاص ✨";
    default:
      return "";
  }
}
