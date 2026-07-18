"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { GachaLocation } from "@/lib/domain/types";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<GachaLocation[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("読み込み中…");

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowser();
      if (!supabase) { setMessage("Supabaseの環境変数が設定されていません"); return; }
      const { data, count, error } = await supabase
        .from("locations")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) setMessage(`読み込めませんでした: ${error.message}`);
      else {
        setLocations((data ?? []) as GachaLocation[]);
        setTotal(count ?? data?.length ?? 0);
        setMessage("");
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.normalize("NFKC").toLowerCase().trim();
    if (!normalized) return locations;
    return locations.filter((location) =>
      [location.name, location.chain_name, location.prefecture, location.address, location.category]
        .filter(Boolean)
        .join(" ")
        .normalize("NFKC")
        .toLowerCase()
        .includes(normalized)
    );
  }, [locations, query]);

  return (
    <main className="min-h-screen bg-yellow-50 px-4 py-8 text-zinc-900">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-black text-pink-500">ADMIN / LOCATIONS</p><h1 className="text-3xl font-black">店舗一覧</h1></div>
          <div className="flex gap-2"><Link href="/admin/import" className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-black text-white">CSV登録</Link><Link href="/admin/locations/new" className="rounded-full bg-pink-500 px-4 py-2 text-sm font-black text-white">＋ 1件追加</Link></div>
        </div>
        <div className="mt-5 rounded-3xl bg-white p-5 shadow">
          <div className="flex flex-wrap items-center gap-3"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="店舗名・住所で絞り込み" className="min-w-64 flex-1 rounded-xl border p-3" /><p className="text-sm font-bold">全{total}件 / 表示{filtered.length}件</p></div>
          {total > 1000 && <p className="mt-2 text-xs text-orange-700">最新1,000件を表示しています。</p>}
          {message && <p className="mt-4 rounded-xl bg-zinc-100 p-4 font-bold">{message}</p>}
          {!message && <div className="mt-5 overflow-x-auto rounded-2xl border"><table className="min-w-full text-left text-sm"><thead className="bg-zinc-100"><tr>{["店舗名", "都道府県", "住所", "区分"].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{filtered.map((location) => <tr key={location.id} className="border-t"><td className="p-3 font-bold"><Link href={`/locations/${location.id}`} className="hover:text-pink-500">{location.name}</Link></td><td className="p-3">{location.prefecture}</td><td className="p-3">{location.address}</td><td className="p-3">{location.source_type === "user" ? "ユーザー" : "公式"}</td></tr>)}</tbody></table></div>}
          <Link href="/admin" className="mt-5 inline-block font-black text-pink-500">← 管理メニューへ</Link>
        </div>
      </section>
    </main>
  );
}
