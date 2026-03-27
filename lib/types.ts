export type InventoryRow = {
  id: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  price: number;
  currency?: string | null;
  image_url?: string | null;
  category?: string | null;
  stock_quantity?: number | null;
};
