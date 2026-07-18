"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

const initialForm = {
  name: "",
  maker: "",
  genre: "",
  workTitle: "",
  characterName: "",
  creator: "",
};

export default function AdminNewProductPage() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setMessage("Supabaseの環境変数が設定されていません");
      return;
    }

    setBusy(true);
    setMessage("重複する商品を確認中…");
    const { data: existing, error: readError } = await supabase
      .from("products")
      .select("id,name,maker")
      .ilike("name", form.name)
      .limit(10);

    if (readError) {
      setMessage(`商品を確認できませんでした: ${readError.message}`);
      setBusy(false);
      return;
    }

    const normalizedMaker = form.maker.normalize("NFKC").trim();
    const duplicate = (existing ?? []).some(
      (item: { maker: string | null }) => (item.maker ?? "").normalize("NFKC").trim() === normalizedMaker
    );
    if (duplicate) {
      setMessage("同じ商品名・メーカーの商品がすでに登録されています");
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("products").insert({
      name: form.name.trim(),
      maker: form.maker.trim() || null,
      genre: form.genre.trim() || null,
      work_title: form.workTitle.trim() || null,
      character_name: form.characterName.trim() || null,
      creator: form.creator.trim() || null,
    });

    if (error) setMessage(`登録できませんでした: ${error.message}`);
    else {
      setForm(initialForm);
      setMessage("商品を登録しました。投稿画面から選択できます");
    }
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-yellow-50 px-4 py-8 text-zinc-900">
      <section className="mx-auto max-w-xl">
        <Link href="/admin" className="font-black text-pink-500">← 管理メニューへ戻る</Link>
        <div className="mt-4 rounded-3xl bg-white p-6 shadow">
          <p className="font-black text-pink-500">ADMIN / PRODUCT</p>
          <h1 className="mt-1 text-3xl font-black">商品を追加</h1>
          <p className="mt-3 text-sm text-zinc-600">商品名だけ必須です。検索に使いたい情報を分かる範囲で入力してください。</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block font-bold">商品名<input required className="mt-1 w-full rounded-xl border p-3" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="block font-bold">メーカー（任意）<input className="mt-1 w-full rounded-xl border p-3" value={form.maker} onChange={(event) => setForm({ ...form, maker: event.target.value })} /></label>
            <label className="block font-bold">ジャンル（任意）<input className="mt-1 w-full rounded-xl border p-3" value={form.genre} onChange={(event) => setForm({ ...form, genre: event.target.value })} placeholder="例：フィギュア" /></label>
            <label className="block font-bold">作品名（任意）<input className="mt-1 w-full rounded-xl border p-3" value={form.workTitle} onChange={(event) => setForm({ ...form, workTitle: event.target.value })} /></label>
            <label className="block font-bold">キャラクター名（任意）<input className="mt-1 w-full rounded-xl border p-3" value={form.characterName} onChange={(event) => setForm({ ...form, characterName: event.target.value })} /></label>
            <label className="block font-bold">作者・クリエイター（任意）<input className="mt-1 w-full rounded-xl border p-3" value={form.creator} onChange={(event) => setForm({ ...form, creator: event.target.value })} /></label>
            {message && <p aria-live="polite" className="rounded-xl bg-zinc-100 p-3 font-bold">{message}</p>}
            <button disabled={busy} className="w-full rounded-2xl bg-pink-500 p-4 text-lg font-black text-white disabled:opacity-50">{busy ? "登録中…" : "商品を登録する"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}
