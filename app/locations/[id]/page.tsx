"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Location = {
  id: string;
  name: string;
  address?: string | null;
  nearest_station?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Product = {
  id?: string;
  name?: string;
  maker?: string | null;
  image_url?: string | null;
};

type Sighting = {
  id: string;
  status: string;
  sighted_at: string;
  comment?: string | null;
  products: Product | null;
};

function statusLabel(status: string) {
  if (status === "plenty") return "残り多そう";
  if (status === "available") return "まだあった";
  if (status === "low") return "少なそう";
  if (status === "sold_out") return "なかった";
  return status;
}

function statusTone(status: string) {
  if (status === "sold_out") return "bg-zinc-200 text-zinc-700";
  if (status === "low") return "bg-orange-100 text-orange-700";
  if (status === "plenty") return "bg-emerald-100 text-emerald-700";
  return "bg-pink-100 text-pink-600";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LocationPage() {
  const params = useParams<{ id: string }>();
  const [locationData, setLocationData] = useState<Location | null>(null);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedLocations = JSON.parse(localStorage.getItem("gachadokoya_saved_locations") || "[]") as string[];
    setSaved(savedLocations.includes(params.id));

    async function load() {
      const [{ data: spot }, { data: sightingData }] = await Promise.all([
        supabase.from("locations").select("*").eq("id", params.id).single(),
        supabase
          .from("sightings")
          .select("id,status,sighted_at,comment,products(*)")
          .eq("location_id", params.id)
          .order("sighted_at", { ascending: false }),
      ]);
      setLocationData((spot as Location | null) ?? null);
      setSightings((sightingData ?? []) as Sighting[]);
      setLoading(false);
    }
    load();
  }, [params.id]);

  const maps = useMemo(() => {
    if (!locationData) return null;
    const query = typeof locationData.latitude === "number" && typeof locationData.longitude === "number"
      ? `${locationData.latitude},${locationData.longitude}`
      : locationData.address || locationData.name;
    return {
      embed: `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`,
      open: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    };
  }, [locationData]);

  function toggleSave() {
    const current = JSON.parse(localStorage.getItem("gachadokoya_saved_locations") || "[]") as string[];
    const next = current.includes(params.id)
      ? current.filter((id) => id !== params.id)
      : [params.id, ...current];
    localStorage.setItem("gachadokoya_saved_locations", JSON.stringify(next));
    setSaved(next.includes(params.id));
  }

  if (loading) return <main className="min-h-screen bg-[#fff9dc] p-6 text-center font-black">店舗情報を読み込み中...</main>;
  if (!locationData) return <main className="min-h-screen bg-[#fff9dc] p-6 text-center"><p className="font-black">店舗が見つかりませんでした</p><Link href="/" className="mt-4 inline-block font-black">← トップへ</Link></main>;

  return (
    <main className="min-h-screen bg-[#fff9dc] px-4 py-6 text-black">
      <section className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3"><Link href="/" className="text-sm font-black">← 検索へ戻る</Link><button onClick={toggleSave} className={`rounded-full px-4 py-2 text-sm font-black shadow ${saved ? "bg-pink-500 text-white" : "bg-white"}`}>{saved ? "★ 店舗を保存中" : "☆ 店舗を保存"}</button></div>

        <article className="mt-4 overflow-hidden rounded-[2rem] bg-white shadow-xl">
          <div className="p-6 md:p-8"><p className="text-xs font-black tracking-widest text-pink-500">GACHA SPOT</p><h1 className="mt-2 text-3xl font-black leading-tight">{locationData.name}</h1>{locationData.address && <p className="mt-4 text-sm font-bold text-zinc-600">{locationData.address}</p>}{locationData.nearest_station && <p className="mt-1 text-sm font-bold text-zinc-600">最寄り：{locationData.nearest_station}</p>}<div className="mt-5 rounded-3xl bg-zinc-50 p-4"><p className="text-xs font-bold text-zinc-500">この場所の目撃情報</p><p className="mt-1 text-2xl font-black">{sightings.length}件</p></div></div>
          {maps && <><iframe title="店舗地図" src={maps.embed} className="h-80 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade"/><div className="grid gap-3 p-4 sm:grid-cols-2"><a href={maps.open} target="_blank" rel="noreferrer" className="rounded-full bg-zinc-900 px-5 py-4 text-center font-black text-white">Googleマップで開く</a><Link href={`/post?location=${encodeURIComponent(locationData.id)}`} className="rounded-full bg-yellow-300 px-5 py-4 text-center font-black">この場所の今を報告</Link></div></>}
        </article>

        <section className="mt-5 rounded-[2rem] bg-white p-6 shadow-xl"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black text-pink-500">RECENT ITEMS</p><h2 className="mt-1 text-2xl font-black">最近見つかったガチャ</h2></div><span className="text-sm font-black text-zinc-400">{sightings.length}件</span></div><div className="mt-4 space-y-3">{sightings.length === 0 && <p className="rounded-3xl bg-zinc-50 p-5 text-center font-bold text-zinc-500">まだ目撃情報がありません</p>}{sightings.map((item) => <Link key={item.id} href={`/sightings/${item.id}`} className="block rounded-3xl border border-zinc-200 p-4 hover:bg-yellow-50"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{item.products?.name || "商品名未登録"}</p>{item.products?.maker && <p className="mt-1 text-xs font-bold text-zinc-500">{item.products.maker}</p>}</div><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${statusTone(item.status)}`}>{statusLabel(item.status)}</span></div><p className="mt-2 text-xs font-bold text-zinc-500">{formatDate(item.sighted_at)}</p>{item.comment && <p className="mt-3 rounded-2xl bg-zinc-50 p-3 text-sm">{item.comment}</p>}</Link>)}</div></section>
      </section>
    </main>
  );
}
