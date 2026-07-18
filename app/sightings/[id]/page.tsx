"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GachaImage } from "@/components/ui/GachaImage";
import { readLocalStorage, toggleStoredId, writeLocalStorage } from "@/lib/browser-storage";
import { useStoredValue } from "@/hooks/useStoredValue";
import { googleMapsUrls, productMetadata, statusLabel, statusTone } from "@/lib/domain/sightings";
import type { Sighting } from "@/lib/domain/types";
import { requireSupabaseBrowser } from "@/lib/supabase";

const supabase = requireSupabaseBrowser();

function elapsedHours(dateText: string) { return Math.max(0, (Date.now() - new Date(dateText).getTime()) / 3_600_000); }
function scoreOf(item: Sighting) { let score = item.status === "plenty" ? 86 : item.status === "available" ? 72 : item.status === "low" ? 38 : 8; const h = elapsedHours(item.sighted_at); if (h <= 1) score += 8; else if (h <= 6) score += 2; else if (h <= 24) score -= 6; else if (h <= 72) score -= 18; else score -= 32; return Math.min(95, Math.max(3, Math.round(score))); }
function scoreText(score: number) { if (score >= 75) return "かなりありそう"; if (score >= 50) return "ありそう"; if (score >= 25) return "可能性は低め"; return "かなり低め"; }
function scoreTone(score: number) { if (score >= 75) return "bg-emerald-500 text-white"; if (score >= 50) return "bg-yellow-300 text-zinc-900"; if (score >= 25) return "bg-orange-400 text-white"; return "bg-zinc-400 text-white"; }
function formatDate(text: string) { return new Date(text).toLocaleString("ja-JP", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }); }

export default function SightingDetailPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<Sighting | null>(null);
  const [related, setRelated] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [favoriteIds] = useStoredValue<string[]>("gachadokoya_favorites", []);
  const [helpedIds] = useStoredValue<string[]>("gachadokoya_helped", []);
  const [storedHelpedCount] = useStoredValue<number>(`gachadokoya_helped_count_${params.id}`, 0);
  const [saved, setSaved] = useState(false);
  const [helped, setHelped] = useState(false);
  const [helpedCount, setHelpedCount] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setSaved(favoriteIds.includes(params.id));
      setHelped(helpedIds.includes(params.id));
      setHelpedCount(storedHelpedCount);
    });
    return () => cancelAnimationFrame(frame);
  }, [favoriteIds, helpedIds, params.id, storedHelpedCount]);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from("sightings").select("id,status,sighted_at,comment,photo_url,products(*),locations(*)").eq("id", params.id).single();
      if (error || !data) { setMessage("目撃情報を読み込めませんでした"); setLoading(false); return; }
      const sighting = data as Sighting;
      setItem(sighting);
      if (sighting.products?.id) {
        const { data: others } = await supabase.from("sightings").select("id,status,sighted_at,comment,photo_url,products(*),locations(*)").eq("product_id", sighting.products.id).neq("id", params.id).order("sighted_at", { ascending: false }).limit(6);
        setRelated((others ?? []) as Sighting[]);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  const maps = useMemo(() => googleMapsUrls(item?.locations), [item]);

  function toggleSave() {
    const next = toggleStoredId("gachadokoya_favorites", params.id);
    setSaved(next.includes(params.id));
  }

  function toggleHelped() {
    const current = readLocalStorage<string[]>("gachadokoya_helped", []);
    const wasHelped = current.includes(params.id);
    const next = wasHelped ? current.filter((id) => id !== params.id) : [params.id, ...current];
    const nextCount = Math.max(0, helpedCount + (wasHelped ? -1 : 1));
    writeLocalStorage("gachadokoya_helped", next);
    localStorage.setItem(`gachadokoya_helped_count_${params.id}`, String(nextCount));
    setHelped(!wasHelped);
    setHelpedCount(nextCount);
  }

  async function share() {
    if (!item) return;
    const text = `${item.products?.name || "ガチャ"}を${item.locations?.name || "店舗"}で目撃！ #ガチャドコヤ`;
    try {
      if (navigator.share) await navigator.share({ title: "ガチャドコヤ", text, url: location.href });
      else { await navigator.clipboard.writeText(`${text}\n${location.href}`); setMessage("リンクをコピーしました"); }
    } catch { /* キャンセル時は何もしない */ }
  }

  if (loading) return <main className="min-h-screen bg-[#fff9dc] p-6"><div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center font-bold shadow">詳細を読み込み中...</div></main>;
  if (!item) return <main className="min-h-screen bg-[#fff9dc] p-6"><div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center shadow"><p className="font-bold text-red-500">{message || "情報が見つかりません"}</p><Link href="/" className="mt-5 inline-block font-black">← 戻る</Link></div></main>;

  const score = scoreOf(item);
  const image = item.products?.image_url || item.photo_url;
  const productMeta = productMetadata(item.products);
  const postHref = `/post?product=${encodeURIComponent(item.products?.id || "")}&location=${encodeURIComponent(item.locations?.id || "")}`;

  return (
    <main className="min-h-screen bg-[#fff9dc] px-4 py-6 text-black">
      <section className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3"><Link href="/" className="text-sm font-black">← 検索結果へ</Link><div className="flex gap-2"><button onClick={share} className="rounded-full bg-white px-4 py-2 text-sm font-black shadow">共有</button><button onClick={toggleSave} className={`rounded-full px-4 py-2 text-sm font-black shadow ${saved ? "bg-pink-500 text-white" : "bg-white"}`}>{saved ? "★ 保存済み" : "☆ 保存"}</button></div></div>

        <div className="mt-4 grid overflow-hidden rounded-[2rem] bg-white shadow-xl md:grid-cols-2">
          {image ? <GachaImage src={image} alt={item.products?.name || "ガチャ商品"} className="aspect-square h-full w-full bg-white object-contain" /> : <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-yellow-100 to-pink-100"><GachaImage src="/subchan/thanks.png" alt="サブちゃん" className="h-48 w-48 object-contain" /></div>}
          <div className="p-6 md:p-8">
            <p className="text-xs font-black tracking-widest text-pink-500">SIGHTING DETAIL</p>
            <h1 className="mt-2 text-3xl font-black leading-tight">{item.products?.id ? <Link href={`/products/${item.products.id}`} className="underline decoration-yellow-300 decoration-4 underline-offset-4">{item.products?.name || "商品名未登録"}</Link> : item.products?.name || "商品名未登録"}</h1>
            {productMeta && <p className="mt-3 text-sm font-bold leading-6 text-zinc-500">{productMeta}</p>}
            <div className="mt-6 flex flex-wrap gap-2"><span className={`rounded-full px-4 py-2 text-sm font-black ${scoreTone(score)}`}>{scoreText(score)}・{score}%</span><span className={`rounded-full px-4 py-2 text-sm font-black ${statusTone(item.status)}`}>{statusLabel(item.status)}</span></div>
            <div className="mt-6 rounded-3xl bg-zinc-50 p-5"><p className="text-xs font-bold text-zinc-500">最終目撃</p><p className="mt-1 text-lg font-black">{formatDate(item.sighted_at)}</p>{item.comment && !item.is_demo && <p className="mt-4 border-t border-zinc-200 pt-4 text-sm leading-7">{item.comment}</p>}</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={toggleHelped} className={`rounded-full px-5 py-4 text-center text-lg font-black shadow ${helped ? "bg-yellow-300 text-zinc-900" : "bg-zinc-100 text-zinc-900"}`}>{helped ? `助かった！済み ${helpedCount}` : `助かった！ ${helpedCount}`}</button><Link href={postHref} className="block rounded-full bg-pink-500 px-5 py-4 text-center text-lg font-black text-white shadow">この商品を今見た！</Link></div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[2rem] bg-white shadow-xl">
          <div className="p-6"><p className="text-xs font-black text-pink-500">SPOT</p><h2 className="mt-1 text-2xl font-black">{item.locations?.id ? <Link href={`/locations/${item.locations.id}`} className="underline decoration-yellow-300 decoration-4 underline-offset-4">{item.locations?.name || "店舗名未登録"}</Link> : item.locations?.name || "店舗名未登録"}</h2>{item.locations?.address && <p className="mt-3 text-sm text-zinc-600">{item.locations.address}</p>}{item.locations?.nearest_station && <p className="mt-1 text-sm font-bold text-zinc-600">最寄り：{item.locations.nearest_station}</p>}</div>
          {maps && <><iframe title="店舗地図" src={maps.embed} className="h-72 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade"/><div className="grid gap-3 p-4 sm:grid-cols-2"><a href={maps.open} target="_blank" rel="noreferrer" className="rounded-full bg-zinc-900 px-5 py-4 text-center font-black text-white">Googleマップで開く</a><Link href={postHref} className="rounded-full bg-yellow-300 px-5 py-4 text-center font-black">この場所の今を報告</Link></div></>}
        </div>

        {related.length > 0 && <div className="mt-5 rounded-[2rem] bg-white p-6 shadow-xl"><div className="flex items-end justify-between"><div><p className="text-xs font-black text-pink-500">OTHER SPOTS</p><h2 className="mt-1 text-2xl font-black">同じ商品の別の目撃場所</h2></div><span className="text-sm font-black text-zinc-400">{related.length}件</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{related.map((other) => <Link key={other.id} href={`/sightings/${other.id}`} className="rounded-3xl border border-zinc-200 p-4 hover:bg-yellow-50"><div className="flex items-center justify-between gap-2"><p className="font-black">{other.locations?.name || "店舗名未登録"}</p><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-black ${statusTone(other.status)}`}>{statusLabel(other.status)}</span></div><p className="mt-2 text-xs font-bold text-zinc-500">{formatDate(other.sighted_at)}</p></Link>)}</div></div>}

        {message && <p className="mt-4 text-center text-sm font-bold text-zinc-600">{message}</p>}
      </section>
    </main>
  );
}
