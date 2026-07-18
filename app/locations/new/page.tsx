"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function NewLocationPage() {
  const [form, setForm] = useState({ name:"", address:"", prefecture:"東京都", category:"雑貨店", latitude:"", longitude:"", note:"" });
  const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  function getCurrentLocation(){
    if(!navigator.geolocation){setMessage("このブラウザでは位置情報を使えません");return;}
    setMessage("現在地を取得中…"); navigator.geolocation.getCurrentPosition((p)=>{setForm({...form,latitude:String(p.coords.latitude),longitude:String(p.coords.longitude)});setMessage("現在地を入力しました。地図上の場所が正しいか確認してください");},()=>setMessage("位置情報を取得できませんでした"));
  }
  async function submit(e:FormEvent){
    e.preventDefault(); const supabase=getSupabaseBrowser(); if(!supabase){setMessage("Supabaseが設定されていません");return;}
    const lat=Number(form.latitude), lng=Number(form.longitude); if(!Number.isFinite(lat)||!Number.isFinite(lng)){setMessage("緯度・経度を確認してください");return;}
    setBusy(true);setMessage("既存店舗を確認中…");
    const {data:existing}=await supabase.from("locations").select("id,name,address").ilike("name",`%${form.name}%`).limit(20);
    const duplicate=(existing??[]).find((x: { name: string; address: string })=>x.name.normalize("NFKC")===form.name.normalize("NFKC")&&x.address.normalize("NFKC")===form.address.normalize("NFKC"));
    if(duplicate){setMessage("同じ店舗名・住所のスポットがすでに登録されています");setBusy(false);return;}
    const {error}=await supabase.from("locations").insert({name:form.name,address:form.address,prefecture:form.prefecture,category:form.category,latitude:lat,longitude:lng,source_type:"user",user_note:form.note||null,source_checked_at:new Date().toISOString().slice(0,10)});
    if(error)setMessage(`登録できませんでした: ${error.message}`); else {setMessage("スポットを登録しました！投稿画面からこの場所を選べます");setForm({name:"",address:"",prefecture:"東京都",category:"雑貨店",latitude:"",longitude:"",note:""});}
    setBusy(false);
  }
  return <main className="min-h-screen bg-yellow-50 px-4 py-8 text-zinc-900"><div className="mx-auto max-w-xl"><Link href="/post" className="font-black text-pink-500">← 目撃情報の投稿へ戻る</Link><section className="mt-4 rounded-3xl bg-white p-6 shadow"><p className="font-black text-pink-500">NEW GACHA SPOT</p><h1 className="text-3xl font-black">未登録のお店を追加</h1><p className="mt-3 leading-7">スーパー、雑貨屋、書店、駄菓子屋など、まだ載っていないガチャスポットを登録できます。</p>
  <form onSubmit={submit} className="mt-6 space-y-4">
  <label className="block font-bold">店名・スポット名<input required className="mt-1 w-full rounded-xl border p-3" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="例：○○スーパー 狛江店"/></label>
  <label className="block font-bold">都道府県<input required className="mt-1 w-full rounded-xl border p-3" value={form.prefecture} onChange={e=>setForm({...form,prefecture:e.target.value})}/></label>
  <label className="block font-bold">住所<input required className="mt-1 w-full rounded-xl border p-3" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="市区町村・番地まで"/></label>
  <label className="block font-bold">お店の種類<select className="mt-1 w-full rounded-xl border p-3" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{["スーパー","雑貨店","書店","ゲームセンター","駄菓子屋","飲食店","駅・公共施設","道の駅","その他"].map(x=><option key={x}>{x}</option>)}</select></label>
  <button type="button" onClick={getCurrentLocation} className="w-full rounded-xl bg-blue-50 p-3 font-black text-blue-700">📍 現在地から緯度・経度を入力</button>
  <div className="grid grid-cols-2 gap-3"><label className="font-bold">緯度<input required className="mt-1 w-full rounded-xl border p-3" value={form.latitude} onChange={e=>setForm({...form,latitude:e.target.value})}/></label><label className="font-bold">経度<input required className="mt-1 w-full rounded-xl border p-3" value={form.longitude} onChange={e=>setForm({...form,longitude:e.target.value})}/></label></div>
  <label className="block font-bold">補足（任意）<textarea className="mt-1 w-full rounded-xl border p-3" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="入口付近に10台くらい、など"/></label>
  {message&&<p className="rounded-xl bg-zinc-100 p-3 font-bold">{message}</p>}<button disabled={busy} className="w-full rounded-2xl bg-pink-500 p-4 text-lg font-black text-white disabled:opacity-50">{busy?"登録中…":"このスポットを登録する"}</button></form></section></div></main>;
}
