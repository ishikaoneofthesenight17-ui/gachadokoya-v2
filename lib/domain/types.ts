/** Product master data returned by Supabase. */
export type Product = {
  id: string;
  name: string;
  maker?: string | null;
  genre?: string | null;
  work_title?: string | null;
  character_name?: string | null;
  creator?: string | null;
  image_url?: string | null;
  series?: string | null;
  series_name?: string | null;
  character?: string | null;
  category?: string | null;
  price?: number | null;
  release_month?: string | null;
  release_period?: string | null;
  official_url?: string | null;
};

export type VerificationStatus = "confirmed" | "candidate";

/** Location master data shared by search, posting, and detail screens. */
export type GachaLocation = {
  id: string;
  name: string;
  address?: string | null;
  nearest_station?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  chain_name?: string | null;
  prefecture?: string | null;
  category?: string | null;
  business_hours?: string | null;
  official_url?: string | null;
  source_type?: "official" | "user" | null;
  source_checked_at?: string | null;
  user_note?: string | null;
  verification_status?: VerificationStatus | null;
  created_at?: string;
  updated_at?: string;
};

export type StockStatus = "plenty" | "available" | "low" | "sold_out";

/** Joined sighting shape. Relations are optional because each query selects a subset. */
export type Sighting = {
  id: string;
  status: StockStatus;
  sighted_at: string;
  comment?: string | null;
  is_demo?: boolean | null;
  photo_url?: string | null;
  product_id?: string;
  location_id?: string;
  products?: Product | null;
  locations?: GachaLocation | null;
};

export type Coordinates = { latitude: number; longitude: number };
