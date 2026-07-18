# ガチャドコヤ

欲しいカプセルトイの最新目撃情報を、商品名や店舗名から検索・共有できるWebアプリです。

## 主な機能

- 商品、キャラクター、メーカー、店舗を横断する表記ゆれ対応検索
- 在庫状況・新着順・見つかる可能性・現在地からの距離による絞り込み
- 商品、店舗、目撃情報の詳細表示とGoogleマップ連携
- 目撃情報投稿と「サブちゃんのお礼ガチャ」
- 未登録店舗のユーザー登録
- 全国店舗マスタのCSV一括登録
- 管理画面からの店舗・商品登録
- 店舗・商品のCSV一括登録とマスタ一覧
- 検索履歴、お気に入り、「助かった！」の端末内保存

## 技術スタック

- Next.js 16（App Router）
- React 19 / TypeScript
- Tailwind CSS 4
- Supabase（Postgres / Row Level Security）

## セットアップ

前提環境は Node.js 22.x、npm 10.x です。

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` にSupabaseの公開接続情報を設定します。

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

開発サーバーは通常 <http://localhost:3000> で起動します。

## コマンド

```bash
npm run dev        # 開発サーバー
npm run lint       # ESLint
npm run typecheck  # TypeScript型チェック
npm run build      # 本番ビルド
npm run start      # 本番サーバー
```

## ディレクトリ構成

```text
app/                    App RouterのページとグローバルCSS
  admin/import/         店舗マスタCSVインポート
  locations/            店舗詳細・ユーザー店舗登録
  products/             商品詳細
  sightings/            目撃情報詳細
  post/                 目撃情報投稿
lib/
  domain/               共通ドメイン型・在庫/距離ロジック
  browser-storage.ts    localStorageの安全な読み書き
  search.ts             表記ゆれ対応検索
  supabase.ts           Supabaseブラウザクライアント
public/                 画像・音声・配布用CSV
supabase/               テーブル定義・追加マイグレーション
```

## 主要ルート

| URL | 機能 |
| --- | --- |
| `/` | 検索、一覧、保存済み情報、Googleマップ導線 |
| `/post` | 目撃情報投稿 |
| `/products/[id]` | 商品詳細と目撃店舗 |
| `/locations/[id]` | 店舗詳細と設置商品 |
| `/locations/new` | 未登録店舗の追加 |
| `/sightings/[id]` | 目撃情報詳細 |
| `/admin/import` | 全国店舗CSVインポート |
| `/admin` | MVP管理メニュー |
| `/admin/locations` | 店舗マスタ一覧 |
| `/admin/locations/new` | 管理者による店舗追加 |
| `/admin/import` | 店舗CSV一括登録 |
| `/admin/products` | 商品マスタ一覧 |
| `/admin/products/new` | 管理者による商品追加 |
| `/admin/products/import` | 商品CSV一括登録 |

## データベース

現行画面は主に次のテーブルを使用します。

- `products`: 商品マスタ
- `locations`: 店舗マスタ
- `sightings`: 目撃情報
- `import_logs`: 店舗CSVの取込履歴

セットアップ用SQLは `supabase/` にあります。

- `migrations/20260718_mvp_catalog_management.sql`: MVP公開に必要な店舗・商品テーブルとRLS
- `migrations/20260718_bulk_master_import.sql`: CSV取込履歴と一覧表示用インデックス
- `schema-v8-location-master.sql`: `locations` の拡張と `import_logs`
- `schema-v5.sql`: 将来DB共有する「助かった！」用の `helpful_reactions`
- `schema.sql`: 旧 `spots` モデルの参考スキーマ

公開前にSupabase SQL Editorで次の順番で実行してください。

1. `supabase/migrations/20260718_mvp_catalog_management.sql`
2. `supabase/migrations/20260718_bulk_master_import.sql`

その後、`/admin/import` から店舗CSV、`/admin/products/import` から商品CSVを登録できます。CSVの列形式は `public/samples/` のテンプレートを参照してください。`sightings` の初期作成SQLは現在このリポジトリに含まれておらず、既存Supabaseプロジェクトに作成済みであることが前提です。

人に見せるための初期データは [DATA_SEED.md](./DATA_SEED.md) を参照してください。主要チェーン77店舗と商品30件の投入用CSVを用意しています。

## ブラウザ保存データ

お気に入り、検索履歴、「助かった！」、お礼ガチャ回数は現在 `localStorage` に保存します。ユーザーアカウント間や別端末では共有されません。

## 運用上の注意

- `/admin/import` には認証がありません。公開運用前に管理者認証とRLSを強化してください。
- 現在地は距離計算にのみ利用し、データベースには保存しません。
- 目撃情報は参考情報であり、店舗の実在庫を保証しません。
- `NEXT_PUBLIC_` で始まる値はブラウザに公開されます。サービスロールキーなどの秘密情報は設定しないでください。
