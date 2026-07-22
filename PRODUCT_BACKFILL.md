# 公式商品バックフィル

公式メーカーの商品カタログを読み取り、既存の `products` を変更せずに候補CSV、確認用SQL、検証レポートを作ります。このコマンド自体はSupabaseへ書き込みません。

## 実行

`.env.local` に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` を設定して実行します。Supabaseは既存商品の読み取りにだけ使われます。

```bash
npm run catalog:backfill
```

取得HTMLは `data/product-backfill/html/` に保存されます。外部サイトへ接続できない場合は、前回のHTMLと既存商品スナップショットを使えます。

```bash
npm run catalog:backfill:offline
```

生成後の件数、欠損、公式ドメイン、文字品質、重複、SQL列と非破壊性、メーカー別代表サンプルは次で再監査できます。

```bash
npm run catalog:backfill:audit
```

保存HTMLを別途配置する場合も、オンライン実行時と同じディレクトリ名・ファイル名にしてください。オンライン取得に失敗したページは同じ場所の保存HTMLへ自動フォールバックします。

## 出力と確認順

1. `data/product-backfill/REPORT.md` と `report.json` で件数・重複・エラーを確認する
2. `data/product-backfill/product-candidates.csv` を目視確認する
3. 問題がなければ `supabase/seeds/20260722_product_backfill_candidates.sql` をSupabase SQL Editorで実行する

重複判定はJANコード、公式URL、正規化したメーカー名＋商品名の順です。SQLも既存行を更新・削除せず、同じ3条件に該当しない候補だけを挿入します。商品画像、店舗、在庫、目撃情報は生成しません。公式ページに明記されない作品名・シリーズ名・キャラクター名・JANコードは空欄のままです。
