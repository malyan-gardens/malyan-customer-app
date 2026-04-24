export type ProductTypeRow = {
  id: string;
  name_ar: string | null;
  icon: string | null;
};

export type InventoryRow = {
  id: string;
  name_ar: string | null;
  description?: string | null;
  selling_price: number | null;
  currency?: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  category?: string | null;
  quantity?: number | null;
  product_type_id?: string | null;
  /** Height label e.g. cm — optional column */
  height_cm?: string | number | null;
};
