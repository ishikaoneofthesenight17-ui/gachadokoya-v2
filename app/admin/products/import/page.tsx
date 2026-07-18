"use client";

import Link from "next/link";
import { type ChangeEvent, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

type ProductCsvRow = {
  name: string;
  maker: string;
  genre: string;
  work_title: string;
  character_name: string;
  creator: string;
};

type ImportResult = { added: number; skipped: number; errors: string[] };

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { current += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else current += character;
  }
  values.push(current.trim());
  return values;
}

function parseCsv(text: string): ProductCsvRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("CSVにデータ行がありません");
  const headers = parseCsvLine(lines[0]);
  if (!headers.includes("name")) throw new Error("必須列 name がありません");
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    return {
      name: record.name ?? "",
      maker: record.maker ?? "",
      genre: record.genre ?? "",
      work_title: record.work_title ?? "",
      character_name: record.character_name ?? "",
      creator: record.creator ?? "",
    };
  });
}

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\s　]/g, "");
}

export default function ProductImportPage() {
  const [rows, setRows] = useState<ProductCsvRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const validCount = useMemo(() => rows.filter((row) => row.name.trim()).length, [rows]);

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    try {
      setRows(parseCsv(await file.text()));
      setMessage("");
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : "CSVを読み込めませんでした");
    }
  }

  async function importRows() {
    const supabase = getSupabaseBrowser();
    if (!supabase) { setMessage("Supabaseの環境変数が設定されていません"); return; }
    setBusy(true);
    setResult(null);
    setMessage("登録済み商品を確認しています…");

    const existing: { name: string; maker: string | null }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("products").select("name,maker").range(from, from + 999);
      if (error) { setMessage(`確認に失敗しました: ${error.message}`); setBusy(false); return; }
      existing.push(...((data ?? []) as { name: string; maker: string | null }[]));
      if ((data?.length ?? 0) < 1000) break;
    }

    const keys = new Set(existing.map((item) => `${normalize(item.name)}|${normalize(item.maker ?? "")}`));
    const unique: Record<string, string | null>[] = [];
    const errors: string[] = [];
    let skipped = 0;

    rows.forEach((row, index) => {
      if (!row.name.trim()) { errors.push(`${index + 2}行目: 商品名がありません`); return; }
      const key = `${normalize(row.name)}|${normalize(row.maker)}`;
      if (keys.has(key)) { skipped += 1; return; }
      keys.add(key);
      unique.push({
        name: row.name.trim(),
        maker: row.maker.trim() || null,
        genre: row.genre.trim() || null,
        work_title: row.work_title.trim() || null,
        character_name: row.character_name.trim() || null,
        creator: row.creator.trim() || null,
      });
    });

    let added = 0;
    for (let index = 0; index < unique.length; index += 200) {
      const { data, error } = await supabase.from("products").insert(unique.slice(index, index + 200)).select("id");
      if (error) errors.push(`${index + 1}件目付近: ${error.message}`);
      else added += data?.length ?? 0;
    }

    await supabase.from("import_logs").insert({
      import_type: "products",
      file_name: fileName,
      total_rows: rows.length,
      added_rows: added,
      skipped_rows: skipped,
      error_rows: errors.length,
    });
    setResult({ added, skipped, errors });
    setMessage("");
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-yellow-50 px-4 py-8 text-zinc-900">
      <section className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <div><p className="font-black text-pink-500">ADMIN / PRODUCT MASTER</p><h1 className="text-3xl font-black">商品CSVインポート</h1></div>
          <Link href="/admin" className="rounded-full bg-white px-4 py-2 font-bold shadow">管理メニューへ</Link>
        </div>
        <div className="mt-6 rounded-3xl bg-white p-6 shadow">
          <p className="leading-7">CSVから商品を一括登録します。同じ<strong>商品名＋メーカー</strong>はスキップします。</p>
          <a href="/samples/products-template.csv" download className="mt-4 inline-block rounded-full bg-zinc-900 px-5 py-3 font-black text-white">CSV見本をダウンロード</a>
          <label className="mt-6 block cursor-pointer rounded-3xl border-2 border-dashed border-zinc-300 p-10 text-center hover:border-pink-400">
            <input type="file" accept=".csv,text/csv" onChange={readFile} className="hidden" />
            <b className="text-xl">商品CSVを選択</b>
          </label>
          {message && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{message}</p>}
          {rows.length > 0 && <>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center"><div className="rounded-2xl bg-zinc-100 p-4"><b className="text-2xl">{rows.length}</b><p>読込件数</p></div><div className="rounded-2xl bg-green-50 p-4"><b className="text-2xl">{validCount}</b><p>登録可能</p></div><div className="rounded-2xl bg-yellow-50 p-4"><b className="text-2xl">{rows.length - validCount}</b><p>要修正</p></div></div>
            <div className="mt-5 overflow-x-auto rounded-2xl border"><table className="min-w-full text-left text-sm"><thead className="bg-zinc-100"><tr>{["商品名", "メーカー", "作品名", "キャラクター"].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{rows.slice(0, 20).map((row, index) => <tr key={index} className="border-t"><td className="p-3 font-bold">{row.name}</td><td className="p-3">{row.maker}</td><td className="p-3">{row.work_title}</td><td className="p-3">{row.character_name}</td></tr>)}</tbody></table></div>
            <button disabled={busy || validCount === 0} onClick={importRows} className="mt-6 w-full rounded-2xl bg-pink-500 px-6 py-4 text-lg font-black text-white disabled:opacity-50">{busy ? "登録中…" : `${validCount}件を登録する`}</button>
          </>}
          {result && <div className="mt-6 rounded-3xl bg-green-50 p-5"><h2 className="text-xl font-black">インポート完了</h2><p className="mt-2">追加 <b>{result.added}件</b> ／ 重複スキップ <b>{result.skipped}件</b> ／ エラー <b>{result.errors.length}件</b></p>{result.errors.length > 0 && <details className="mt-3"><summary className="font-bold">エラーを見る</summary><ul className="mt-2 list-disc pl-5 text-sm">{result.errors.map((error, index) => <li key={index}>{error}</li>)}</ul></details>}</div>}
        </div>
      </section>
    </main>
  );
}
