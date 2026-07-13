"use client";
import { useState } from "react";
import { X } from "lucide-react";
import type { StockStatus } from "@/lib/types";
import { getSupabaseBrowser } from "@/lib/supabase";

const initial = { shop_name: "", address: "", product_name: "", maker: "", category: "", price: "", status: "found" as StockStatus, comment: "", lat: "35.6812", lng: "139.7671" };

export default function ReportModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const supabase = getSupabaseBrowser();
    if (!supabase) { setMessage("Supabaseの環境変数が未設定です。入力画面の確認はできます。"); setBusy(false); return; }
    const payload = { ...form, price: form.price ? Number(form.price) : null, lat: Number(form.lat), lng: Number(form.lng), witnessed_at: new Date().toISOString() };
    const { error } = await supabase.from("spots").insert(payload);
    if (error) setMessage(`登録できませんでした: ${error.message}`);
    else { setMessage("目撃情報を登録しました！"); setForm(initial); onSaved(); setTimeout(onClose, 700); }
    setBusy(false);
  }

  return <div className="modal-backdrop" onClick={onClose}><div className="report-modal" onClick={(e) => e.stopPropagation()}>
    <button className="icon-button modal-close" onClick={onClose}><X /></button>
    <div className="modal-title"><span>📍</span><div><small>REPORT NOW</small><h2>今見たガチャを登録</h2></div></div>
    <form onSubmit={submit} className="report-form">
      <label>商品名<input required value={form.product_name} onChange={(e)=>setForm({...form,product_name:e.target.value})} placeholder="例：ねこのミニチュア" /></label>
      <label>お店・スポット名<input required value={form.shop_name} onChange={(e)=>setForm({...form,shop_name:e.target.value})} placeholder="例：○○駅前ガチャコーナー" /></label>
      <label>住所<input required value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})} placeholder="東京都…" /></label>
      <div className="form-row"><label>メーカー<input value={form.maker} onChange={(e)=>setForm({...form,maker:e.target.value})} /></label><label>ジャンル<input value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})} /></label></div>
      <div className="form-row"><label>価格<input type="number" value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})} /></label><label>状態<select value={form.status} onChange={(e)=>setForm({...form,status:e.target.value as StockStatus})}><option value="found">あった</option><option value="low">残り少なめ</option><option value="soldout">なかった</option><option value="unknown">不明</option></select></label></div>
      <div className="form-row"><label>緯度<input required value={form.lat} onChange={(e)=>setForm({...form,lat:e.target.value})} /></label><label>経度<input required value={form.lng} onChange={(e)=>setForm({...form,lng:e.target.value})} /></label></div>
      <label>ひとこと<textarea value={form.comment} onChange={(e)=>setForm({...form,comment:e.target.value})} placeholder="何階・どの辺・残り具合など" /></label>
      {message && <p className="form-message">{message}</p>}
      <button disabled={busy} className="primary-button full">{busy ? "登録中…" : "この目撃情報を登録する"}</button>
    </form>
  </div></div>;
}
