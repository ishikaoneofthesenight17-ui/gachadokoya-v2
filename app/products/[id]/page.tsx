"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GachaImage } from "@/components/ui/GachaImage";
import { toggleStoredId } from "@/lib/browser-storage";
import { useStoredValue } from "@/hooks/useStoredValue";
import { formatSightingDate, statusLabel, statusTone } from "@/lib/domain/sightings";
import type { Product, Sighting } from "@/lib/domain/types";
import { requireSupabaseBrowser } from "@/lib/supabase";

const supabase = requireSupabaseBrowser();

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedProducts] = useStoredValue<string[]>("gachadokoya_saved_products", []);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSaved(savedProducts.includes(params.id)));
    return () => cancelAnimationFrame(frame);
  }, [params.id, savedProducts]);

  useEffect(() => {
    async function load() {
      const [{ data: productData }, { data: sightingData }] = await Promise.all([
        supabase.from("products").select("*").eq("id", params.id).single(),
        supabase
          .from("sightings")
          .select("id,status,sighted_at,comment,is_demo,photo_url,locations(*)")
          .eq("product_id", params.id)
          .order("sighted_at", { ascending: false }),
      ]);

      setProduct((productData as Product | null) ?? null);
      setSightings((sightingData ?? []) as Sighting[]);
      setLoading(false);
    }

    load();
  }, [params.id]);

  const latest = sightings[0];
  const activeCount = useMemo(
    () => sightings.filter((item) => ["plenty", "available", "low"].includes(item.status)).length,
    [sightings]
  );

  function toggleSave() {
    const next = toggleStoredId("gachadokoya_saved_products", params.id);
    setSaved(next.includes(params.id));
  }

  if (loading) {
    return <main className="min-h-screen bg-[#fff9dc] p-6 text-center font-black">商品情報を読み込み中...</main>;
  }

  if (!product) {
    return <main className="min-h-screen bg-[#fff9dc] p-6 text-center"><p className="font-black">商品が見つかりませんでした</p><Link href="/" className="mt-4 inline-block font-black">← トップへ</Link></main>;
  }

  const meta = [product.work_title, product.character_name, product.genre, product.creator].filter(Boolean);

  return (
    <main className="min-h-screen bg-[#fff9dc] px-4 py-6 text-black">
      <section className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-black">← 検索へ戻る</Link>
          <button onClick={toggleSave} className={`rounded-full px-4 py-2 text-sm font-black shadow ${saved ? "bg-pink-500 text-white" : "bg-white"}`}>
            {saved ? "★ 商品を保存中" : "☆ 商品を保存"}
          </button>
        </div>

        <article className="mt-4 overflow-hidden rounded-[2rem] bg-white shadow-xl md:grid md:grid-cols-2">
          <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-yellow-100 to-pink-100 p-6">
            {product.image_url ? (
              <GachaImage src={product.image_url} alt={product.name} className="h-full w-full object-contain" />
            ) : (
              <GachaImage src="/subchan/thanks.png" alt="サブちゃん" className="h-52 w-52 object-contain" />
            )}
          </div>
          <div className="p-6 md:p-8">
            <p className="text-xs font-black tracking-widest text-pink-500">PRODUCT</p>
            <h1 className="mt-2 text-3xl font-black leading-tight">{product.name}</h1>
            {product.maker && <p className="mt-3 text-lg font-black">{product.maker}</p>}
            {meta.length > 0 && <p className="mt-2 text-sm font-bold leading-6 text-zinc-500">{meta.join(" / ")}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-zinc-50 p-4"><p className="text-xs font-bold text-zinc-500">目撃情報</p><p className="mt-1 text-2xl font-black">{sightings.length}件</p></div>
              <div className="rounded-3xl bg-zinc-50 p-4"><p className="text-xs font-bold text-zinc-500">今ありそう</p><p className="mt-1 text-2xl font-black">{activeCount}件</p></div>
            </div>

            {latest && <div className="mt-4 rounded-3xl bg-yellow-50 p-4"><p className="text-xs font-bold text-zinc-500">最新の目撃</p><p className="mt-1 font-black">{latest.locations?.name || "店舗名未登録"}</p><p className="mt-1 text-sm font-bold text-zinc-500">{formatSightingDate(latest.sighted_at)}</p></div>}
            <Link href={`/post?product=${encodeURIComponent(product.id)}`} className="mt-5 block rounded-full bg-pink-500 px-5 py-4 text-center text-lg font-black text-white shadow">この商品を見つけた</Link>
          </div>
        </article>

        <section className="mt-5 rounded-[2rem] bg-white p-6 shadow-xl">
          <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black text-pink-500">LATEST SIGHTINGS</p><h2 className="mt-1 text-2xl font-black">最近見つかった場所</h2></div><span className="text-sm font-black text-zinc-400">{sightings.length}件</span></div>
          <div className="mt-4 space-y-3">
            {sightings.length === 0 && <p className="rounded-3xl bg-zinc-50 p-5 text-center font-bold text-zinc-500">まだ目撃情報がありません</p>}
            {sightings.map((item) => (
              <Link key={item.id} href={`/sightings/${item.id}`} className="block rounded-3xl border border-zinc-200 p-4 hover:bg-yellow-50">
                <div className="flex items-start justify-between gap-3"><div><p className="font-black">{item.locations?.name || "店舗名未登録"}</p>{item.locations?.address && <p className="mt-1 text-xs text-zinc-500">{item.locations.address}</p>}</div><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${statusTone(item.status)}`}>{statusLabel(item.status)}</span></div>
                <p className="mt-2 text-xs font-bold text-zinc-500">{formatSightingDate(item.sighted_at)}</p>
                {item.comment && !item.is_demo && <p className="mt-3 rounded-2xl bg-zinc-50 p-3 text-sm">{item.comment}</p>}
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
