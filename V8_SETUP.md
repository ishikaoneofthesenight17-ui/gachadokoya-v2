# ガチャドコヤ v8 セットアップ

## 1. Supabase
SupabaseのSQL Editorで `supabase/schema-v8-location-master.sql` をすべて実行します。

## 2. 全国店舗CSV
サイトの `/admin/import` を開きます。
`public/samples/locations-template.csv` と同じ列名でCSVを作り、読み込んで登録します。

必須列: name, address, latitude, longitude
任意列: chain_name, prefecture, category, business_hours, official_url, source_checked_at

重複判定は「店舗名＋住所」です。

## 3. 小規模店舗のユーザー登録
サイトの `/locations/new` から登録できます。
投稿画面の「未登録のお店を追加」リンクからも移動できます。

## 注意
現段階の管理画面にはログイン制限を設けていません。公開運用前に管理者認証を追加してください。
