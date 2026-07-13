export type StockStatus = "found" | "low" | "soldout" | "unknown";

export type Spot = {
  id: string;
  shop_name: string;
  address: string;
  lat: number;
  lng: number;
  product_name: string;
  maker?: string | null;
  category?: string | null;
  price?: number | null;
  status: StockStatus;
  comment?: string | null;
  image_url?: string | null;
  witnessed_at: string;
  created_at?: string;
};
