import type { SupabaseClient } from "@supabase/supabase-js";
import type { GachaLocation, Product, Sighting } from "@/lib/domain/types";

const PAGE_SIZE = 1000;

export async function fetchAllLocations(client: SupabaseClient) {
  const rows: GachaLocation[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await client.from("locations").select("*")
      .order("prefecture", { nullsFirst: false }).order("name").order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (result.error) return { data: null, error: result.error };
    const page = (result.data ?? []) as GachaLocation[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { data: rows, error: null };
  }
}

export async function fetchAllProducts(client: SupabaseClient) {
  const rows: Product[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await client.from("products").select("*").order("name").order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (result.error) return { data: null, error: result.error };
    const page = (result.data ?? []) as Product[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { data: rows, error: null };
  }
}

export async function fetchAllSightings(client: SupabaseClient) {
  const rows: Sighting[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await client.from("sightings")
      .select("id,product_id,location_id,status,sighted_at,comment,is_demo,photo_url,products(*),locations(*)")
      .order("sighted_at", { ascending: false }).order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (result.error) return { data: null, error: result.error };
    const page = (result.data ?? []) as unknown as Sighting[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { data: rows, error: null };
  }
}
