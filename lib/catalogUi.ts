import type { InventoryRow } from "./types";

/** Fisher–Yates shuffle (returns new array). */
export function shuffleArray<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Resolved HTTPS image URLs for a product (image_urls JSON/array or image_url). */
export function getProductImageUrls(item: InventoryRow): string[] {
  const fallback = item.image_url ? [item.image_url] : [];
  const raw = item.image_urls;
  if (!raw) return fallback;
  if (Array.isArray(raw)) {
    const parsed = raw
      .map((v: unknown) => String(v ?? "").trim())
      .filter((v: string) => /^https?:\/\//.test(v));
    return parsed.length ? parsed : fallback;
  }
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) return fallback;
    try {
      const parsedJson = JSON.parse(value) as unknown;
      if (Array.isArray(parsedJson)) {
        const parsed = parsedJson
          .map((v: unknown) => String(v ?? "").trim())
          .filter((v: string) => /^https?:\/\//.test(v));
        if (parsed.length) return parsed;
      }
    } catch {
      const parsed = value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => /^https?:\/\//.test(v));
      if (parsed.length) return parsed;
    }
  }
  return fallback;
}
