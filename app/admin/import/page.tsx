"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

type CsvRow = {
  name: string;
  chain_name: string;
  prefecture: string;
  address: string;
  latitude: string;
  longitude: string;
  category: string;
  business_hours: string;
  official_url: string;
  source_checked_at: string;
};

type ImportResult = { added: number; skipped: number; errors: string[] };

const requiredHeaders = ["name", "address", "latitude", "longitude"];

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { values.push(current.trim()); current = ""; }
    else current += char;
  }
  values.push(current.trim());
  return values;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("CSVにデータ行がありません");
  const headers = parseCsvLine(lines[0]).map((item) => item.trim());
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`必須列がありません: ${missing.join(", ")}`);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    return {
      name: record.name ?? "", chain_name: record.chain_name ?? "", prefecture: record.prefecture ?? "",
      address: record.address ?? "", latitude: record.latitude ?? "", longitude: record.longitude ?? "",
      category: record.category ?? "ガチャ専門店", business_hours: record.business_hours ?? "",
      official_url: record.official_url ?? "", source_checked_at: record.source_checked_at ?? "",
    };
  });
}

function normalize(value: string) { return value.normalize("NFKC").toLowerCase().replace(/[\s　]/g, ""); }

export default function LocationImportPage() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const validCount = useMemo(() => rows.filter((row) => row.name && row.address && Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude))).length, [rows]);

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setResult(null);
    try { setRows(parseCsv(await file.text())); setMessage(""); }
    catch (error) { setRows([]); setMessage(error instanceof Error ? error.message : "CSVを読み込めませんでした"); }
  }

  async function importRows() {
    const supabase = getSupabaseBrowser();
    if (!supabase) { setMessage("Supabaseの環境変数が設定されていません"); return; }
    setBusy(true); setResult(null); setMessage("登録済み店舗を確認しています…");
    const existing: { name: string; address: string }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error: readError } = await supabase.from("locations").select("name,address").range(from, from + 999);
      if (readError) { setMessage(`確認に失敗しました: ${readError.message}`); setBusy(false); return; }
      existing.push(...((data ?? []) as { name: string; address: string }[]));
      if ((data?.length ?? 0) < 1000) break;
    }
    const keys = new Set(existing.map((item) => `${normalize(item.name)}|${normalize(item.address)}`));
    const unique: Record<string, unknown>[] = []; const errors: string[] = []; let skipped = 0;
    rows.forEach((row, index) => {
      const latitude = Number(row.latitude); const longitude = Number(row.longitude);
      if (!row.name || !row.address || !Number.isFinite(latitude) || !Number.isFinite(longitude)) { errors.push(`${index + 2}行目: 必須項目または緯度経度が不正`); return; }
      const key = `${normalize(row.name)}|${normalize(row.address)}`;
      if (keys.has(key)) { skipped += 1; return; }
      keys.add(key);
      unique.push({ name: row.name, chain_name: row.chain_name || null, prefecture: row.prefecture || null, address: row.address,
        latitude, longitude, category: row.category || "ガチャ専門店", business_hours: row.business_hours || null,
        official_url: row.official_url || null, source_type: "official", source_checked_at: row.source_checked_at || new Date().toISOString().slice(0, 10) });
    });
    let added = 0;
    for (let i = 0; i < unique.length; i += 200) {
      const { data, error } = await supabase.from("locations").insert(unique.slice(i, i + 200)).select("id");
      if (error) errors.push(`${i + 1}件目付近: ${error.message}`); else added += data?.length ?? 0;
    }
    await supabase.from("import_logs").insert({ import_type: "locations", file_name: fileName, total_rows: rows.length, added_rows: added, skipped_rows: skipped, error_rows: errors.length });
    setResult({ added, skipped, errors }); setMessage(""); setBusy(false);
  }

  return <main className="min-h-screen bg-yellow-50 px-4 py-8 text-zinc-900">
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between"><div><p className="font-black text-pink-500">ADMIN / LOCATION MASTER</p><h1 className="text-3xl font-black">全国店舗CSVインポート</h1></div><Link href="/admin" className="rounded-full bg-white px-4 py-2 font-bold shadow">管理メニューへ</Link></div>
      <section className="rounded-3xl bg-white p-6 shadow">
        <p className="leading-7">全国のガチャ専門店や大型店舗をCSVでまとめて登録します。同じ<strong>店舗名＋住所</strong>は自動でスキップします。</p>
        <a href="/samples/locations-template.csv" download className="mt-4 inline-block rounded-full bg-zinc-900 px-5 py-3 font-black text-white">CSV見本をダウンロード</a>
        <label className="mt-6 block cursor-pointer rounded-3xl border-2 border-dashed border-zinc-300 p-10 text-center hover:border-pink-400">
          <input type="file" accept=".csv,text/csv" onChange={readFile} className="hidden" />
          <b className="text-xl">CSVを選択</b><p className="mt-2 text-sm text-zinc-500">ExcelやGoogleスプレッドシートからCSV形式で保存できます</p>
        </label>
        {message && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{message}</p>}
        {rows.length > 0 && <><div className="mt-6 grid grid-cols-3 gap-3 text-center"><div className="rounded-2xl bg-zinc-100 p-4"><b className="text-2xl">{rows.length}</b><p>読込件数</p></div><div className="rounded-2xl bg-green-50 p-4"><b className="text-2xl">{validCount}</b><p>登録可能</p></div><div className="rounded-2xl bg-yellow-50 p-4"><b className="text-2xl">{rows.length-validCount}</b><p>要修正</p></div></div>
          <div className="mt-5 overflow-x-auto rounded-2xl border"><table className="min-w-full text-left text-sm"><thead className="bg-zinc-100"><tr>{["店舗名","チェーン","都道府県","住所"].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{rows.slice(0,20).map((row,i)=><tr key={i} className="border-t"><td className="p-3 font-bold">{row.name}</td><td className="p-3">{row.chain_name}</td><td className="p-3">{row.prefecture}</td><td className="p-3">{row.address}</td></tr>)}</tbody></table></div>
          <button disabled={busy || validCount===0} onClick={importRows} className="mt-6 w-full rounded-2xl bg-pink-500 px-6 py-4 text-lg font-black text-white disabled:opacity-50">{busy ? "登録中…" : `${validCount}件を登録する`}</button></>}
        {result && <div className="mt-6 rounded-3xl bg-green-50 p-5"><h2 className="text-xl font-black">インポート完了</h2><p className="mt-2">追加 <b>{result.added}件</b> ／ 重複スキップ <b>{result.skipped}件</b> ／ エラー <b>{result.errors.length}件</b></p>{result.errors.length>0&&<details className="mt-3"><summary className="font-bold">エラーを見る</summary><ul className="mt-2 list-disc pl-5 text-sm">{result.errors.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}</div>}
      </section>
    </div>
  </main>;
}
