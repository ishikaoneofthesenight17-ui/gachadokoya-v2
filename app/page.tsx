"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { matchesFlexibleSearch } from "./search-utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Product = {
  id?: string;
  name?: string;
  maker?: string | null;
  genre?: string | null;
  work_title?: string | null;
  character_name?: string | null;
  creator?: string | null;
  image_url?: string | null;
};

type Location = {
  id?: string;
  name?: string;
  address?: string | null;
  nearest_station?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Sighting = {
  id: string;
  status: string;
  sighted_at: string;
  comment: string | null;
  is_demo?: boolean | null;
  photo_url?: string | null;
  products: Product | null;
  locations: Location | null;
};

type CurrentCoords = { latitude: number; longitude: number };
type StatusFilter = "all" | "available" | "low" | "sold_out";
type SortMode = "likelihood" | "new" | "near";
type ViewMode = "list" | "map" | "favorites";

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "available", label: "ありそう" },
  { value: "low", label: "少なそう" },
  { value: "sold_out", label: "なかった" },
];

const sortModes: { value: SortMode; label: string }[] = [
  { value: "likelihood", label: "可能性順" },
  { value: "new", label: "新しい順" },
  { value: "near", label: "近い順" },
];

const quickWords = ["猫", "ちいかわ", "サンリオ", "アクキー", "フィギュア"];

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

function likelihoodTone(score: number) {
  if (score >= 75) return "bg-emerald-500 text-white";
  if (score >= 50) return "bg-yellow-300 text-zinc-900";
  if (score >= 25) return "bg-orange-400 text-white";
  return "bg-zinc-400 text-white";
}

function calcDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceKm(currentCoords: CurrentCoords | null, item: Sighting) {
  const lat = item.locations?.latitude;
  const lng = item.locations?.longitude;
  if (!currentCoords || typeof lat !== "number" || typeof lng !== "number") return null;
  return calcDistanceKm(currentCoords.latitude, currentCoords.longitude, lat, lng);
}

function elapsedHours(dateText: string) {
  return Math.max(0, (Date.now() - new Date(dateText).getTime()) / 3_600_000);
}

function likelihoodScore(item: Sighting) {
  let score = item.status === "plenty" ? 86 : item.status === "available" ? 72 : item.status === "low" ? 38 : 8;
  const hours = elapsedHours(item.sighted_at);
  if (hours <= 1) score += 8;
  else if (hours <= 6) score += 2;
  else if (hours <= 24) score -= 6;
  else if (hours <= 72) score -= 18;
  else score -= 32;
  return Math.min(95, Math.max(3, Math.round(score)));
}

function likelihoodText(score: number) {
  if (score >= 75) return "かなりありそう";
  if (score >= 50) return "ありそう";
  if (score >= 25) return "低め";
  return "かなり低め";
}

function formatDate(dateText: string) {
  return new Date(dateText).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function productMeta(product: Product | null) {
  return [product?.work_title, product?.character_name, product?.genre, product?.creator, product?.maker]
    .filter(Boolean)
    .join(" / ");
}

function mapUrl(item: Sighting) {
  const location = item.locations;
  const query =
    typeof location?.latitude === "number" && typeof location?.longitude === "number"
      ? `${location.latitude},${location.longitude}`
      : location?.address || location?.name || "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function Home() {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("likelihood");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentLocation, setCurrentLocation] = useState("");
  const [currentCoords, setCurrentCoords] = useState<CurrentCoords | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [helped, setHelped] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(JSON.parse(localStorage.getItem("gachadokoya_favorites") || "[]"));
    setHelped(JSON.parse(localStorage.getItem("gachadokoya_helped") || "[]"));
    setRecentSearches(JSON.parse(localStorage.getItem("gachadokoya_recent_searches") || "[]"));

    async function loadSightings() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("sightings")
.select("id,status,sighted_at,comment,is_demo,photo_url,products(*),locations(*)")        .order("sighted_at", { ascending: false });
      if (error) {
        console.error(error);
        setErrorMessage("目撃情報を読み込めませんでした");
      } else {
        setSightings((data ?? []) as Sighting[]);
      }
      setIsLoading(false);
    }
    loadSightings();
  }, []);

  function rememberSearch(value: string) {
    const clean = value.trim();
    if (!clean) return;
    const next = [clean, ...recentSearches.filter((item) => item !== clean)].slice(0, 5);
    setRecentSearches(next);
    localStorage.setItem("gachadokoya_recent_searches", JSON.stringify(next));
  }

  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter((item) => item !== id) : [id, ...favorites];
    setFavorites(next);
    localStorage.setItem("gachadokoya_favorites", JSON.stringify(next));
  }

  function toggleHelped(id: string) {
    const next = helped.includes(id) ? helped.filter((item) => item !== id) : [id, ...helped];
    setHelped(next);
    localStorage.setItem("gachadokoya_helped", JSON.stringify(next));
  }

  function handleGetLocation() {
    if (!navigator.geolocation) {
      setCurrentLocation("このブラウザでは位置情報が使えません");
      return;
    }
    setCurrentLocation("現在地を取得中...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setSortMode("near");
        setCurrentLocation("📍 現在地を取得しました。近い順で表示中");
      },
      () => setCurrentLocation("位置情報を取得できませんでした")
    );
  }

  const filteredSightings = useMemo(() => {
    return sightings
      .filter((item) => {
        if (viewMode === "favorites" && !favorites.includes(item.id)) return false;
        if (statusFilter === "available" && !["plenty", "available"].includes(item.status)) return false;
        if (!["all", "available"].includes(statusFilter) && item.status !== statusFilter) return false;
        return matchesFlexibleSearch(
          [
            item.products?.name,
            item.products?.work_title,
            item.products?.character_name,
            item.products?.genre,
            item.products?.creator,
            item.products?.maker,
            item.locations?.name,
            item.locations?.address,
            item.locations?.nearest_station,
            item.comment,
            statusLabel(item.status),
          ],
          keyword
        );
      })
      .sort((a, b) => {
        if (sortMode === "near" && currentCoords) return (distanceKm(currentCoords, a) ?? 9999) - (distanceKm(currentCoords, b) ?? 9999);
        if (sortMode === "new") return new Date(b.sighted_at).getTime() - new Date(a.sighted_at).getTime();
        return likelihoodScore(b) - likelihoodScore(a);
      });
  }, [currentCoords, favorites, keyword, sightings, sortMode, statusFilter, viewMode]);

  const topSighting = filteredSightings[0];
  const hasSearchQuery = keyword.trim().length > 0 || viewMode === "favorites";
  const freshCount = sightings.filter((item) => elapsedHours(item.sighted_at) <= 24).length;
  const locationCount = new Set(sightings.map((item) => item.locations?.id).filter(Boolean)).size;

  return (
    <main className="min-h-screen bg-[#fff9dc] pb-28 text-black">
      <section className="mx-auto max-w-md px-4 py-6">
        <header className="text-center">
          <div className="flex items-center justify-center gap-2"><p className="text-sm font-black tracking-widest text-pink-500">GACHA SIGHTING MAP</p><span className="rounded-full bg-zinc-900 px-2 py-1 text-[10px] font-black text-white">v6</span></div>
          <h1 className="mt-1 text-4xl font-black tracking-tight">ガチャドコヤ</h1>
          <p className="mt-2 font-bold text-zinc-700">欲しいガチャ、どこにある？</p>
        </header>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm"><p className="text-xl font-black">{sightings.length}</p><p className="text-[11px] font-bold text-zinc-500">目撃情報</p></div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm"><p className="text-xl font-black">{freshCount}</p><p className="text-[11px] font-bold text-zinc-500">24時間以内</p></div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm"><p className="text-xl font-black">{locationCount}</p><p className="text-[11px] font-bold text-zinc-500">スポット</p></div>
        </div>

        <div className="mt-4 rounded-[2rem] bg-yellow-300 p-4 shadow-lg">
          <form onSubmit={(e) => { e.preventDefault(); rememberSearch(keyword); }}>
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-full bg-white px-5 py-4 text-base font-bold shadow-sm outline-none focus:ring-4 focus:ring-pink-200"
                placeholder="商品・キャラ・メーカー・店舗"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <button className="rounded-full bg-zinc-900 px-5 font-black text-white" type="submit">検索</button>
            </div>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {quickWords.map((word) => (
              <button key={word} onClick={() => { setKeyword(word); rememberSearch(word); }} className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-black">{word}</button>
            ))}
          </div>

          <button onClick={handleGetLocation} className="mt-3 w-full rounded-full bg-white px-4 py-3 text-sm font-black shadow-sm">📍 現在地から近い順にする</button>
          {currentLocation && <p className="mt-2 text-center text-xs font-bold">{currentLocation}</p>}
        </div>

        {!hasSearchQuery && recentSearches.length > 0 && (
          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm font-black">最近の検索</p><button onClick={() => { setRecentSearches([]); localStorage.removeItem("gachadokoya_recent_searches"); }} className="text-xs font-bold text-zinc-400">消去</button></div>
            <div className="mt-3 flex flex-wrap gap-2">{recentSearches.map((word) => <button key={word} onClick={() => setKeyword(word)} className="rounded-full bg-zinc-100 px-3 py-2 text-sm font-bold">↻ {word}</button>)}</div>
          </div>
        )}

        <Link href="/post" className="mt-4 block rounded-full bg-pink-500 px-5 py-4 text-center text-lg font-black text-white shadow-lg">＋ 目撃情報を投稿する</Link>
        <p className="mt-2 text-center text-xs font-bold text-zinc-500">投稿するとサブちゃんのお礼ガチャが回ります</p>

        <div className="mt-6 grid grid-cols-3 rounded-2xl bg-white p-1 shadow-sm">
          {([['list','一覧'],['map','地図'],['favorites',`保存 ${favorites.length}`]] as [ViewMode,string][]).map(([value,label]) => (
            <button key={value} onClick={() => setViewMode(value)} className={`rounded-xl py-2.5 text-sm font-black ${viewMode === value ? 'bg-zinc-900 text-white' : 'text-zinc-500'}`}>{label}</button>
          ))}
        </div>

        {hasSearchQuery && (
          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between"><p className="font-black">{viewMode === 'favorites' ? '保存した情報' : `「${keyword}」の検索結果`}</p><p className="text-sm font-black text-pink-500">{filteredSightings.length}件</p></div>
            <div className="mt-3 grid grid-cols-4 gap-1.5">{statusFilters.map((filter) => <button key={filter.value} onClick={() => setStatusFilter(filter.value)} className={`rounded-full px-2 py-2 text-xs font-black ${statusFilter === filter.value ? 'bg-zinc-900 text-white' : 'bg-zinc-100'}`}>{filter.label}</button>)}</div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">{sortModes.map((mode) => <button key={mode.value} onClick={() => setSortMode(mode.value)} className={`rounded-full px-2 py-2 text-xs font-black ${sortMode === mode.value ? 'bg-pink-500 text-white' : 'bg-zinc-100'}`}>{mode.label}</button>)}</div>
          </div>
        )}

        {topSighting && hasSearchQuery && (
          <Link href={`/sightings/${topSighting.id}`} className="mt-4 block rounded-[2rem] bg-zinc-900 p-5 text-white shadow-xl">
            <p className="text-xs font-black text-yellow-300">いま最も見つかりそう</p>
            <p className="mt-2 text-xl font-black">{topSighting.products?.name || '商品名未登録'}</p>
            <p className="mt-1 text-sm text-zinc-300">📍 {topSighting.locations?.name}</p>
            <div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-black ${likelihoodTone(likelihoodScore(topSighting))}`}>{likelihoodText(likelihoodScore(topSighting))}</span><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{formatDate(topSighting.sighted_at)}</span></div>
          </Link>
        )}

        {errorMessage && <div className="mt-5 rounded-3xl bg-white p-6 text-center font-bold text-red-500 shadow">{errorMessage}</div>}
        {isLoading && <div className="mt-5 rounded-3xl bg-white p-6 text-center font-bold shadow">読み込み中...</div>}

        {!isLoading && viewMode === "map" && filteredSightings.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-[2rem] bg-white shadow-lg">
            <div className="bg-gradient-to-br from-emerald-100 via-sky-100 to-yellow-100 p-5">
              <p className="text-sm font-black">地図ビュー</p>
              <p className="mt-1 text-xs font-bold text-zinc-600">各スポットを押すとGoogleマップが開きます</p>
              <div className="mt-4 space-y-2">
                {filteredSightings.slice(0, 8).map((item, index) => (
                  <a key={item.id} href={mapUrl(item)} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-white/90 p-3 shadow-sm">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pink-500 font-black text-white">{index + 1}</span>
                    <span className="min-w-0"><span className="block truncate text-sm font-black">{item.locations?.name}</span><span className="block truncate text-xs font-bold text-zinc-500">{item.products?.name}</span></span>
                    <span className="ml-auto text-lg">↗</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isLoading && filteredSightings.length === 0 && hasSearchQuery && <div className="mt-5 rounded-3xl bg-white p-7 text-center shadow"><p className="text-lg font-black">見つかりませんでした 🔍</p><p className="mt-2 text-sm text-zinc-600">短い言葉や別の表記でも探してみてください</p></div>}

        {!isLoading && viewMode !== "map" && hasSearchQuery && (
          <div className="mt-5 space-y-4">
            {filteredSightings.map((item, index) => {
              const km = distanceKm(currentCoords, item);
              const score = likelihoodScore(item);
              const meta = productMeta(item.products);
              const isFavorite = favorites.includes(item.id);
              const image = item.products?.image_url || item.photo_url;
              return (
                <article key={item.id} className="overflow-hidden rounded-[2rem] bg-white shadow-lg">
                  {image && <img src={image} alt={item.products?.name || 'ガチャ商品'} className="h-44 w-full bg-white object-contain" />}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        {item.products?.id ? (
                          <Link href={`/products/${item.products.id}`} className="block text-lg font-black underline decoration-yellow-300 decoration-4 underline-offset-4">
                            {item.products?.name || '商品名未登録'}
                          </Link>
                        ) : (
                          <p className="text-lg font-black">{item.products?.name || '商品名未登録'}</p>
                        )}
                        {meta && <p className="mt-1 line-clamp-2 text-xs font-bold text-zinc-500">{meta}</p>}
                      </div>
                      <button onClick={() => toggleFavorite(item.id)} aria-label="保存" className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl ${isFavorite ? 'bg-pink-100' : 'bg-zinc-100'}`}>{isFavorite ? '★' : '☆'}</button>
                    </div>
                    {item.locations?.id ? (
                      <Link href={`/locations/${item.locations.id}`} className="mt-3 block text-sm font-black underline decoration-yellow-300 decoration-4 underline-offset-4">📍 {item.locations?.name}</Link>
                    ) : (
                      <p className="mt-3 text-sm font-bold">📍 {item.locations?.name}</p>
                    )}
                    {item.locations?.address && <p className="mt-1 text-xs text-zinc-500">{item.locations.address}</p>}
                    <Link href={`/sightings/${item.id}`} className="block">
                      <div className="mt-3 flex flex-wrap gap-2">
                        {currentCoords && sortMode === "near" && index === 0 && <span className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-black">最寄り</span>}
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${likelihoodTone(score)}`}>{likelihoodText(score)}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(item.status)}`}>{statusLabel(item.status)}</span>
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold">{formatDate(item.sighted_at)}</span>
                        {km !== null && <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold">約{km.toFixed(1)}km</span>}
                      </div>
{item.comment && !item.is_demo && (
  <p className="mt-4 border-t border-zinc-200 pt-4 text-sm leading-7">
    {item.comment}
  </p>
)}          </Link>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button onClick={() => toggleHelped(item.id)} className={`rounded-full px-4 py-3 text-sm font-black ${helped.includes(item.id) ? 'bg-yellow-300' : 'bg-zinc-100'}`}>
                        {helped.includes(item.id) ? '助かった！済み' : '助かった！'}
                      </button>
                      <Link href={`/post?product=${encodeURIComponent(item.products?.id || '')}&location=${encodeURIComponent(item.locations?.id || '')}`} className="rounded-full bg-pink-500 px-4 py-3 text-center text-sm font-black text-white">今見た！</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!hasSearchQuery && !isLoading && (
          <div className="mt-6 rounded-[2rem] bg-white p-6 text-center shadow-sm">
            <img src="/subchan/thanks.png" alt="サブちゃん" className="mx-auto h-32 w-32 object-contain" />
            <p className="mt-3 text-xl font-black">探したいガチャを入力してね</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">商品名だけでなく、キャラクター名・メーカー・店舗名からも探せます。</p>
          </div>
        )}

        <footer className="mt-10 flex justify-center gap-5 text-xs font-bold text-zinc-500"><Link href="/about">このサービスについて</Link><Link href="/privacy">プライバシー</Link></footer>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <button onClick={() => { setViewMode('list'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="rounded-2xl py-2 text-center text-xs font-black">🔍<span className="mt-1 block">探す</span></button>
          <Link href="/post" className="rounded-2xl bg-pink-500 py-2 text-center text-xs font-black text-white shadow">＋<span className="mt-1 block">投稿</span></Link>
          <button onClick={() => { setViewMode('favorites'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="rounded-2xl py-2 text-center text-xs font-black">★<span className="mt-1 block">保存</span></button>
        </div>
      </nav>
    </main>
  );
}
