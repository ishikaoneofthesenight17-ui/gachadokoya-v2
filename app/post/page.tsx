"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Product = {
  id: string;
  name: string;
  maker?: string | null;
  genre?: string | null;
  work_title?: string | null;
  character_name?: string | null;
  creator?: string | null;
};

type Location = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

type CurrentCoords = {
  latitude: number;
  longitude: number;
};

type ThanksResult = {
  rarity: "ふつう" | "いい感じ" | "レア" | "激レア";
  title: string;
  message: string;
  emoji: string;
  cardClass: string;
  weight: number;
};

const thanksResults: ThanksResult[] = [
  {
    rarity: "ふつう",
    title: "さわやかなお礼",
    message: "ご報告ありがとうございます。またさわやかにお会いしましょう。",
    emoji: "🐾",
    cardClass: "from-yellow-200 to-amber-100 text-zinc-900",
    weight: 18,
  },
  {
    rarity: "ふつう",
    title: "通常運転のお礼",
    message: "どうも。おいら、ちゃんと感謝してますよ。",
    emoji: "🎩",
    cardClass: "from-zinc-100 to-white text-zinc-900",
    weight: 17,
  },
  {
    rarity: "ふつう",
    title: "控えめなお礼",
    message: "……助かりました。以上です。",
    emoji: "🙂",
    cardClass: "from-slate-200 to-zinc-100 text-zinc-900",
    weight: 14,
  },
  {
    rarity: "いい感じ",
    title: "イケテルお礼",
    message: "イケテルネ！ あなたの情報で誰かの無駄足が減るんですよ。",
    emoji: "✨",
    cardClass: "from-pink-300 to-yellow-200 text-zinc-900",
    weight: 14,
  },
  {
    rarity: "いい感じ",
    title: "ちょっと大げさなお礼",
    message: "これは大変な功績です。今日は胸を張って歩いてください。",
    emoji: "🏅",
    cardClass: "from-orange-300 to-yellow-200 text-zinc-900",
    weight: 11,
  },
  {
    rarity: "いい感じ",
    title: "猫からの正式なお礼",
    message: "猫を代表してお礼申し上げます。代表になった覚えはありません。",
    emoji: "🐈",
    cardClass: "from-lime-200 to-emerald-100 text-zinc-900",
    weight: 9,
  },
  {
    rarity: "レア",
    title: "派手なお礼",
    message: "おめでとうございます！ 紙吹雪は各自でご用意ください！",
    emoji: "🎊",
    cardClass: "from-fuchsia-500 to-orange-400 text-white",
    weight: 7,
  },
  {
    rarity: "レア",
    title: "哲学的なお礼",
    message: "情報とは何か。親切とは何か。ひとまず投稿ありがとうございます。",
    emoji: "🪐",
    cardClass: "from-indigo-600 to-violet-500 text-white",
    weight: 5,
  },
  {
    rarity: "レア",
    title: "先回りのお礼",
    message: "投稿すると思ってましたよ。おいらは信じていました。たった今から。",
    emoji: "🔮",
    cardClass: "from-cyan-500 to-blue-600 text-white",
    weight: 3,
  },
  {
    rarity: "激レア",
    title: "サブちゃん大感謝祭",
    message: "あなたの親切により、本日の世界は少しだけ良くなりました。たぶん。",
    emoji: "👑",
    cardClass: "from-yellow-400 via-pink-500 to-purple-600 text-white",
    weight: 2,
  },
];

function drawThanksResult() {
  const totalWeight = thanksResults.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of thanksResults) {
    random -= item.weight;
    if (random <= 0) return item;
  }

  return thanksResults[0];
}

function calcDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function productMeta(product: Product) {
  return [
    product.work_title,
    product.character_name,
    product.genre,
    product.creator,
    product.maker,
  ]
    .filter(Boolean)
    .join(" / ");
}

export default function PostPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [status, setStatus] = useState("plenty");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<CurrentCoords | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [thanksResult, setThanksResult] = useState<ThanksResult | null>(null);
  const [thanksCount, setThanksCount] = useState(0);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    setThanksCount(Number(localStorage.getItem("gachadokoya_thanks_count") ?? "0"));

    async function loadOptions() {
      const [{ data: productData }, { data: locationData }] = await Promise.all([
        supabase.from("products").select("*").order("name"),
        supabase
          .from("locations")
          .select("id, name, latitude, longitude")
          .order("name"),
      ]);

      const nextProducts = (productData ?? []) as Product[];
      const nextLocations = (locationData ?? []) as Location[];

      setProducts(nextProducts);
      setLocations(nextLocations);
      const params = new URLSearchParams(window.location.search);
      const requestedProduct = params.get("product");
      const requestedLocation = params.get("location");
      setProductId(requestedProduct && nextProducts.some((item) => item.id === requestedProduct) ? requestedProduct : nextProducts[0]?.id ?? "");
      setLocationId(requestedLocation && nextLocations.some((item) => item.id === requestedLocation) ? requestedLocation : nextLocations[0]?.id ?? "");
    }

    loadOptions();
  }, []);

  useEffect(() => {
    if (!thanksResult) return;

    const audio = new Audio("/subchan/doumo-arigatou.mp3");
    audio.volume = 0.9;
    audio.play().catch(() => {
      // ブラウザ側で自動再生が止められた場合は、表示だけ続ける
    });
  }, [thanksResult]);

  const selectedProduct = products.find((product) => product.id === productId);

  const sortedLocations = useMemo(() => {
    if (!currentCoords) return locations;

    return [...locations].sort((a, b) => {
      const distanceA = calcDistanceKm(
        currentCoords.latitude,
        currentCoords.longitude,
        a.latitude,
        a.longitude
      );
      const distanceB = calcDistanceKm(
        currentCoords.latitude,
        currentCoords.longitude,
        b.latitude,
        b.longitude
      );

      return distanceA - distanceB;
    });
  }, [currentCoords, locations]);

  function getDistanceLabel(location: Location) {
    if (!currentCoords) return "";

    const km = calcDistanceKm(
      currentCoords.latitude,
      currentCoords.longitude,
      location.latitude,
      location.longitude
    );

    return `（約${km.toFixed(1)}km）`;
  }

  function handleGetLocationForPost() {
    if (!navigator.geolocation) {
      setLocationMessage("このブラウザでは位置情報が使えません");
      return;
    }

    setLocationMessage("現在地を取得中...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrentCoords(coords);
        setLocationMessage("📍 現在地に近い順で場所を並べました");

        const nearestLocation = [...locations].sort((a, b) => {
          const distanceA = calcDistanceKm(
            coords.latitude,
            coords.longitude,
            a.latitude,
            a.longitude
          );
          const distanceB = calcDistanceKm(
            coords.latitude,
            coords.longitude,
            b.latitude,
            b.longitude
          );

          return distanceA - distanceB;
        })[0];

        if (nearestLocation) setLocationId(nearestLocation.id);
      },
      () => {
        setLocationMessage("位置情報を取得できませんでした");
      }
    );
  }

  async function handleSubmit() {
    if (!productId || !locationId) {
      setMessage("商品または場所が選択されていません");
      return;
    }

    setIsSubmitting(true);
    setMessage("投稿中...");

    const { error } = await supabase.from("sightings").insert({
      product_id: productId,
      location_id: locationId,
      status,
      comment,
      sighted_at: new Date().toISOString(),
      photo_url: "",
    });

    if (error) {
      console.error(error);
      setMessage("投稿に失敗しました。時間をおいてもう一度お試しください");
      setIsSubmitting(false);
      return;
    }

    const result = drawThanksResult();
    const nextCount = thanksCount + 1;
    localStorage.setItem("gachadokoya_thanks_count", String(nextCount));
    setThanksCount(nextCount);
    setThanksResult(result);
    setMessage("");
    setComment("");
    setIsSubmitting(false);
  }

  async function handleShare() {
    if (!thanksResult) return;

    const text = `ガチャドコヤに目撃情報を投稿したら、サブちゃんのお礼ガチャで「${thanksResult.title}」が出ました。\n${thanksResult.message}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "サブちゃんのお礼ガチャ", text });
        return;
      }

      await navigator.clipboard.writeText(text);
      setShareMessage("結果をコピーしました");
    } catch {
      setShareMessage("共有をキャンセルしました");
    }
  }

  function resetForAnotherPost() {
    setThanksResult(null);
    setShareMessage("");
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-[#fffdf0] p-6 text-black">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm font-bold text-zinc-600">
          ← トップへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-black">目撃情報を投稿</h1>
        <p className="mt-2">見つけた情報が、次に探す人の近道になります。</p>

        <div className="mt-5 rounded-3xl bg-yellow-300 p-4 shadow">
          <p className="text-sm font-bold">投稿後のお楽しみ</p>
          <p className="mt-1 text-xl font-black">サブちゃんのお礼ガチャ</p>
          <p className="mt-2 text-sm font-bold text-zinc-700">
            感謝の仕方は毎回ランダム。派手な時も、塩っぽい時もあります。
          </p>
          {thanksCount > 0 && (
            <p className="mt-2 text-xs font-bold text-zinc-600">
              この端末でお礼を受け取った回数：{thanksCount}回
            </p>
          )}
        </div>

        <form
          className="mt-8 space-y-5 rounded-3xl bg-white p-5 shadow"
onSubmit={(event) => {
  event.preventDefault();
  handleSubmit();
}}        >
          <div>
            <label className="font-bold">商品</label>
            <select
              className="mt-2 w-full rounded-2xl border p-3"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            {selectedProduct && productMeta(selectedProduct) && (
              <p className="mt-2 text-xs font-bold text-zinc-500">
                {productMeta(selectedProduct)}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="font-bold">場所</label>
              <button
                type="button"
                onClick={handleGetLocationForPost}
                className="rounded-full bg-yellow-300 px-3 py-2 text-sm font-bold"
              >
                近い場所を選ぶ
              </button>
            </div>

            {locationMessage && (
              <p className="mt-2 text-sm font-bold text-zinc-600">{locationMessage}</p>
            )}

            <select
              className="mt-2 w-full rounded-2xl border p-3"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              {sortedLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} {getDistanceLabel(location)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold">在庫状況</label>
            <select
              className="mt-2 w-full rounded-2xl border p-3"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="plenty">残り多そう</option>
              <option value="available">まだあった</option>
              <option value="low">少なそう</option>
              <option value="sold_out">なかった</option>
            </select>
          </div>

          <div>
            <label className="font-bold">コメント</label>
            <textarea
              className="mt-2 min-h-28 w-full rounded-2xl border p-3"
              placeholder="例：入口近くにありました／補充直後っぽかった／売り切れでした"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <button
            disabled={isSubmitting}
            className="w-full rounded-full bg-pink-500 p-4 text-lg font-black text-white disabled:opacity-60"
          >
            {isSubmitting ? "投稿中..." : "目撃情報を投稿してお礼ガチャを回す"}
          </button>

          {message && <p className="text-center font-bold">{message}</p>}
        </form>
      </div>

      {thanksResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-5 shadow-2xl">
            <p className="text-center text-sm font-black text-pink-500">
              投稿ありがとうございました
            </p>
            <h2 className="mt-1 text-center text-2xl font-black">
              サブちゃんのお礼ガチャ
            </h2>

            <div
              className={`relative mt-5 overflow-hidden rounded-[2rem] bg-gradient-to-br p-6 text-center shadow-inner ${thanksResult.cardClass}`}
            >
              <div className="absolute left-5 top-4 text-xl">✨</div>
              <div className="absolute right-5 top-8 text-2xl">🎉</div>
              <div className="absolute bottom-5 left-8 text-xl">🐾</div>
              <p className="text-xs font-black tracking-widest opacity-80">
                {thanksResult.rarity}
              </p>
              <img
                src="/subchan/thanks.png"
                alt="お礼するサブちゃん"
                className="mx-auto mt-3 h-44 w-44 object-contain drop-shadow-md"
              />
              <p className="mt-4 text-2xl font-black">{thanksResult.title}</p>
              <p className="mt-3 text-base font-bold leading-7">
                {thanksResult.message}
              </p>
            </div>

            <p className="mt-4 text-center text-xs font-bold text-zinc-500">
              サブちゃんが声でもお礼します。
            </p>
            <button
              type="submit"
              onClick={handleShare}
              className="mt-5 w-full rounded-full bg-zinc-900 px-5 py-4 font-black text-white"
            >
              結果をシェアする
            </button>
            {shareMessage && (
              <p className="mt-2 text-center text-sm font-bold text-zinc-600">
                {shareMessage}
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={resetForAnotherPost}
                className="rounded-full bg-yellow-300 px-4 py-3 font-black"
              >
                もう1件投稿
              </button>
              <Link
                href="/"
                className="rounded-full bg-pink-500 px-4 py-3 text-center font-black text-white"
              >
                トップへ戻る
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
