"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

const initialForm = {
  name: "",
  chainName: "",
  prefecture: "東京都",
  address: "",
  category: "ガチャ専門店",
  latitude: "",
  longitude: "",
  businessHours: "",
  officialUrl: "",
};

export default function AdminNewLocationPage() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("このブラウザでは位置情報を利用できません");
      return;
    }
    setMessage("現在地を取得中…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({ ...current, latitude: String(coords.latitude), longitude: String(coords.longitude) }));
        setMessage("現在地を入力しました。住所と座標を確認してください");
      },
      () => setMessage("位置情報を取得できませんでした")
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setMessage("Supabaseの環境変数が設定されていません");
      return;
    }

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setMessage("緯度・経度を確認してください");
      return;
    }

    setBusy(true);
    setMessage("重複する店舗を確認中…");
    const { data: existing, error: readError } = await supabase
      .from("locations")
      .select("id,name,address")
      .ilike("name", form.name)
      .limit(10);

    if (readError) {
      setMessage(`店舗を確認できませんでした: ${readError.message}`);
      setBusy(false);
      return;
    }

    const normalizedAddress = form.address.normalize("NFKC").trim();
    const duplicate = (existing ?? []).some(
      (item: { address: string }) => item.address.normalize("NFKC").trim() === normalizedAddress
    );
    if (duplicate) {
      setMessage("同じ店舗名・住所の店舗がすでに登録されています");
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("locations").insert({
      name: form.name.trim(),
      chain_name: form.chainName.trim() || null,
      prefecture: form.prefecture.trim(),
      address: form.address.trim(),
      category: form.category,
      latitude,
      longitude,
      business_hours: form.businessHours.trim() || null,
      official_url: form.officialUrl.trim() || null,
      source_type: "official",
      source_checked_at: new Date().toISOString().slice(0, 10),
    });

    if (error) setMessage(`登録できませんでした: ${error.message}`);
    else {
      setForm(initialForm);
      setMessage("店舗を登録しました。投稿画面から選択できます");
    }
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-yellow-50 px-4 py-8 text-zinc-900">
      <section className="mx-auto max-w-xl">
        <Link href="/admin" className="font-black text-pink-500">← 管理メニューへ戻る</Link>
        <div className="mt-4 rounded-3xl bg-white p-6 shadow">
          <p className="font-black text-pink-500">ADMIN / LOCATION</p>
          <h1 className="mt-1 text-3xl font-black">店舗を追加</h1>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block font-bold">店舗名<input required className="mt-1 w-full rounded-xl border p-3" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="block font-bold">チェーン名（任意）<input className="mt-1 w-full rounded-xl border p-3" value={form.chainName} onChange={(event) => setForm({ ...form, chainName: event.target.value })} /></label>
            <label className="block font-bold">都道府県<input required className="mt-1 w-full rounded-xl border p-3" value={form.prefecture} onChange={(event) => setForm({ ...form, prefecture: event.target.value })} /></label>
            <label className="block font-bold">住所<input required className="mt-1 w-full rounded-xl border p-3" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
            <label className="block font-bold">店舗カテゴリ<select className="mt-1 w-full rounded-xl border p-3" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{["ガチャ専門店", "スーパー", "雑貨店", "書店", "ゲームセンター", "その他"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <button type="button" onClick={useCurrentLocation} className="w-full rounded-xl bg-blue-50 p-3 font-black text-blue-700">📍 現在地から座標を入力</button>
            <div className="grid grid-cols-2 gap-3">
              <label className="font-bold">緯度<input required inputMode="decimal" className="mt-1 w-full rounded-xl border p-3" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} /></label>
              <label className="font-bold">経度<input required inputMode="decimal" className="mt-1 w-full rounded-xl border p-3" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} /></label>
            </div>
            <label className="block font-bold">営業時間（任意）<input className="mt-1 w-full rounded-xl border p-3" value={form.businessHours} onChange={(event) => setForm({ ...form, businessHours: event.target.value })} placeholder="例：10:00〜21:00" /></label>
            <label className="block font-bold">公式URL（任意）<input type="url" className="mt-1 w-full rounded-xl border p-3" value={form.officialUrl} onChange={(event) => setForm({ ...form, officialUrl: event.target.value })} /></label>
            {message && <p aria-live="polite" className="rounded-xl bg-zinc-100 p-3 font-bold">{message}</p>}
            <button disabled={busy} className="w-full rounded-2xl bg-pink-500 p-4 text-lg font-black text-white disabled:opacity-50">{busy ? "登録中…" : "店舗を登録する"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}
