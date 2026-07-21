"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GachaImage } from "@/components/ui/GachaImage";
import { VerificationBadge } from "@/components/VerificationBadge";
import { toggleStoredId } from "@/lib/browser-storage";
import { useStoredValue } from "@/hooks/useStoredValue";
import { googleMapsUrls, statusLabel, statusTone } from "@/lib/domain/sightings";
import type { GachaLocation, Product, Sighting } from "@/lib/domain/types";
import { requireSupabaseBrowser } from "@/lib/supabase";

const supabase = requireSupabaseBrowser();

type ProductSummary = {
  product: Product | null;
  latest: Sighting;
  reports: number;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

export default function LocationPage() {
  const params = useParams<{ id: string }>();
  const [locationData, setLocationData] = useState<GachaLocation | null>(null);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedLocations] = useStoredValue<string[]>("gachadokoya_saved_locations", []);
  const [saved, setSaved] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSaved(savedLocations.includes(params.id)));
    return () => cancelAnimationFrame(frame);
  }, [params.id, savedLocations]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMessage("");
      const [{ data: spot, error: locationError }, { data: sightingData, error: sightingsError }] = await Promise.all([
        supabase.from("locations").select("*").eq("id", params.id).single(),
        supabase
          .from("sightings")
          .select("id,status,sighted_at,comment,photo_url,is_demo,products(*)")
          .eq("location_id", params.id)
          .order("sighted_at", { ascending: false }),
      ]);

      if (locationError || sightingsError) {
        console.error(locationError || sightingsError);
        setErrorMessage("店舗情報を読み込めませんでした。時間をおいてもう一度お試しください。");
      }
      setLocationData((spot as GachaLocation | null) ?? null);
      setSightings((sightingData ?? []) as Sighting[]);
      setLoading(false);
    }
    load();
  }, [params.id]);

  const maps = useMemo(() => googleMapsUrls(locationData), [locationData]);

  const productSummaries = useMemo<ProductSummary[]>(() => {
    const grouped = new Map<string, ProductSummary>();
    for (const sighting of sightings) {
      const key = sighting.products?.id || sighting.products?.name || sighting.id;
      const current = grouped.get(key);
      if (!current) grouped.set(key, { product: sighting.products ?? null, latest: sighting, reports: 1 });
      else current.reports += 1;
    }
    return Array.from(grouped.values());
  }, [sightings]);

  const activeProducts = productSummaries.filter(({ latest }) => ["plenty", "available", "low"].includes(latest.status)).length;
  const latestSighting = sightings[0];

  function toggleSave() {
    const next = toggleStoredId("gachadokoya_saved_locations", params.id);
    setSaved(next.includes(params.id));
  }

  async function shareLocation() {
    if (!locationData) return;
    const text = `${locationData.name}の最新ガチャ情報をガチャドコヤで見る`;
    try {
      if (navigator.share) await navigator.share({ title: locationData.name, text, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        setShareMessage("ページのリンクをコピーしました");
      }
    } catch {
      setShareMessage("");
    }
  }

  if (loading) return <main className="min-h-screen bg-[#fff9dc] p-6 text-center font-black">店舗情報を読み込み中...</main>;
  if (!locationData) return <main className="min-h-screen bg-[#fff9dc] p-6 text-center"><p className="font-black">店舗が見つかりませんでした</p>{errorMessage && <p className="mt-2 text-sm text-red-500">{errorMessage}</p>}<Link href="/" className="mt-4 inline-block font-black">← トップへ</Link></main>;

  return (
    <main className="min-h-screen bg-[#fff9dc] px-4 pb-28 pt-5 text-black">
      <section className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-black">← 検索へ戻る</Link>
          <div className="flex gap-2">
            <button onClick={shareLocation} className="rounded-full bg-white px-4 py-2 text-sm font-black shadow">共有</button>
            <button onClick={toggleSave} className={`rounded-full px-4 py-2 text-sm font-black shadow ${saved ? "bg-pink-500 text-white" : "bg-white"}`}>{saved ? "★ 保存中" : "☆ 保存"}</button>
          </div>
        </div>
        {shareMessage && <p className="mt-2 text-right text-xs font-bold text-zinc-500">{shareMessage}</p>}
        {errorMessage && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{errorMessage}</p>}

        <article className="mt-4 overflow-hidden rounded-[2rem] bg-white shadow-xl">
          <div className="p-6 md:p-8">
            <p className="text-xs font-black tracking-widest text-pink-500">GACHA SPOT</p>
            <h1 className="mt-2 text-3xl font-black leading-tight">{locationData.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2"><VerificationBadge status={locationData.verification_status} />{locationData.chain_name && <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-600">{locationData.chain_name}</span>}{locationData.prefecture && <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold">{locationData.prefecture}</span>}{locationData.category && <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold">{locationData.category}</span>}</div>
            {locationData.verification_status !== "confirmed" && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">この店舗は設置候補です。ガチャの設置・在庫・取扱を確認済みという意味ではありません。最新の目撃投稿または現地情報をご確認ください。</p>}
            {locationData.address && <p className="mt-4 text-sm font-bold text-zinc-600">📍 {locationData.address}</p>}
            {locationData.nearest_station && <p className="mt-1 text-sm font-bold text-zinc-600">🚉 {locationData.nearest_station}</p>}
            {locationData.official_url && <a href={locationData.official_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-black text-pink-600 underline">公式店舗ページ ↗</a>}

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-3xl bg-yellow-100 p-4 text-center"><p className="text-xs font-bold text-zinc-500">登録商品</p><p className="mt-1 text-2xl font-black">{productSummaries.length}</p></div>
              <div className="rounded-3xl bg-pink-50 p-4 text-center"><p className="text-xs font-bold text-zinc-500">ありそう</p><p className="mt-1 text-2xl font-black">{activeProducts}</p></div>
              <div className="rounded-3xl bg-zinc-50 p-4 text-center"><p className="text-xs font-bold text-zinc-500">全報告</p><p className="mt-1 text-2xl font-black">{sightings.length}</p></div>
            </div>
            {latestSighting && <p className="mt-4 text-xs font-bold text-zinc-500">最終更新：{relativeTime(latestSighting.sighted_at)}（{formatDate(latestSighting.sighted_at)}）</p>}
          </div>

          {maps && <>
            <iframe title="店舗地図" src={maps.embed} className="h-72 w-full border-0 md:h-80" loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <a href={maps.open} target="_blank" rel="noreferrer" className="rounded-full bg-zinc-900 px-5 py-4 text-center font-black text-white">Googleマップで開く ↗</a>
              <Link href={`/post?location=${encodeURIComponent(locationData.id)}`} className="rounded-full bg-yellow-300 px-5 py-4 text-center font-black">この場所の今を報告</Link>
            </div>
          </>}
        </article>

        <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-xl md:p-6">
          <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black text-pink-500">CURRENT ITEMS</p><h2 className="mt-1 text-2xl font-black">この店舗のガチャ</h2></div><span className="text-sm font-black text-zinc-400">{productSummaries.length}種類</span></div>
          <div className="mt-4 space-y-3">
            {productSummaries.length === 0 && <div className="rounded-3xl bg-zinc-50 p-6 text-center"><p className="font-black">まだ目撃情報がありません</p><p className="mt-2 text-sm text-zinc-500">最初の報告をすると、次に探す人の助けになります。</p><Link href={`/post?location=${encodeURIComponent(locationData.id)}`} className="mt-4 inline-block rounded-full bg-pink-500 px-5 py-3 font-black text-white">最初の情報を投稿する</Link></div>}
            {productSummaries.map(({ product, latest, reports }) => {
              const image = product?.image_url || latest.photo_url;
              return <article key={product?.id || latest.id} className="overflow-hidden rounded-3xl border border-zinc-200">
                <div className="flex gap-4 p-4">
                  <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-zinc-50 text-3xl">{image ? <GachaImage src={image} alt={product?.name || "ガチャ商品"} className="h-full w-full object-contain"/> : "🎁"}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2"><div className="min-w-0">{product?.id ? <Link href={`/products/${product.id}`} className="font-black underline decoration-yellow-300 decoration-4 underline-offset-4">{product.name || "商品名未登録"}</Link> : <p className="font-black">{product?.name || "商品名未登録"}</p>}{product?.maker && <p className="mt-1 text-xs font-bold text-zinc-500">{product.maker}</p>}</div><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${statusTone(latest.status)}`}>{statusLabel(latest.status)}</span></div>
                    <p className="mt-3 text-xs font-black text-pink-500">最新：{relativeTime(latest.sighted_at)}</p>
                    <p className="mt-1 text-xs text-zinc-500">報告 {reports}件</p>
                  </div>
                </div>
{latest.comment && !latest.is_demo && (
  <p className="mx-4 mb-3 rounded-2xl bg-zinc-50 p-3 text-sm leading-6">
    {latest.comment}
  </p>
)}
                <div className="grid grid-cols-2 border-t border-zinc-100">
                  <Link href={`/sightings/${latest.id}`} className="px-4 py-3 text-center text-sm font-black">詳細を見る</Link>
                  <Link href={`/post?product=${encodeURIComponent(product?.id || "")}&location=${encodeURIComponent(locationData.id)}`} className="bg-pink-500 px-4 py-3 text-center text-sm font-black text-white">今見た！</Link>
                </div>
              </article>;
            })}
          </div>
        </section>

        {sightings.length > 0 && <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-xl md:p-6"><div className="flex items-end justify-between"><div><p className="text-xs font-black text-pink-500">HISTORY</p><h2 className="mt-1 text-2xl font-black">最近の報告</h2></div><span className="text-sm font-black text-zinc-400">新しい順</span></div><div className="mt-4 space-y-2">{sightings.slice(0, 10).map((item) => <Link key={item.id} href={`/sightings/${item.id}`} className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone(item.status)}`}>{statusLabel(item.status)}</span><span className="min-w-0 flex-1 truncate text-sm font-black">{item.products?.name || "商品名未登録"}</span><span className="shrink-0 text-xs font-bold text-zinc-500">{relativeTime(item.sighted_at)}</span></Link>)}</div></section>}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3"><a href={maps?.open} target="_blank" rel="noreferrer" className="rounded-full bg-zinc-900 px-4 py-3 text-center text-sm font-black text-white">地図を開く</a><Link href={`/post?location=${encodeURIComponent(locationData.id)}`} className="rounded-full bg-pink-500 px-4 py-3 text-center text-sm font-black text-white">＋ 今を報告</Link></div>
      </div>
    </main>
  );
}
