# 初期データ

人に見せられる初期状態を作るための検証済みデータです。確認日は全行に `source_checked_at` として記録しています。

## Supabaseへ一括投入（推奨）

`supabase/seeds/20260718_verified_catalog.sql` は既存行を削除せず、同一店舗（店舗名＋住所）と同一商品（JANコード）をスキップします。

店舗追加SQLはサイズと確認単位を分けるため、次の4ファイルに分割しています。

1. `20260718_verified_catalog.sql`（基本店舗、ガチャガチャの森、商品）
2. `20260718_gashapon_department_expansion.sql`
3. `20260718_cpla_expansion.sql`
4. `20260718_dream_capsule_expansion.sql`

収録内容は、公式ページでガチャ専門店として確認できた店舗504件と、バンダイ公式2026年7月発売予定商品157件です。

店舗内訳は、ガシャポンのデパート40件、ガチャガチャの森系133件（Pon! 15件を含む）、#C-pla／シープラ246件、ドリームカプセル85件です。

#C-pla公式APIには285ページありますが、39ページは公式API本文に完全な住所または都道府県がなく、推測で補完しない方針のため未収録です。#C-plaとシープラは同一ブランドとして集計しています。

## 店舗マスタ

`public/seeds/major-gacha-locations.csv` の既存77件は変更せず保持しています。追加分は `public/seeds/gachagachanomori-additional-2026-07.csv` と `public/seeds/priority-chain-additional-2026-07.csv` に分けて収録しています。

- ガシャポンのデパート
- ガチャガチャの森
- #C-pla（シープラ）
- ドリームカプセル
- イオン
- イトーヨーカドー
- ヨドバシカメラ
- ビックカメラ
- ドン・キホーテ
- アニメイト
- TSUTAYA
- ヴィレッジヴァンガード

住所と店舗名は各社公式店舗ページを基準に作成し、座標は国土地理院住所検索APIで住所から補完しています。商業施設内の階数まで含む座標ではなく、建物・住所地点の座標です。営業状況やカプセルトイ設置状況は変わるため、公開後も定期確認が必要です。

既存CSVに含まれるスーパー・家電量販店等は店舗の実在は確認済みですが、ガチャ設置状況を店舗単位で確認できていないため、今回の一括投入SQLからは除外しています。

## 商品マスタ

既存の `public/seeds/products-2026.csv` 30件は変更せず保持しています。新しい `public/seeds/bandai-products-2026-07.csv` は公式発売予定ページから取得した157件で、商品名、メーカー、シリーズ名、価格、公式カテゴリ、発売週、JANコード、商品URL、確認日を収録しています。

シリーズ名は公式商品名から商品種別語を機械的に分離し、分離できない場合は公式商品名をそのまま格納しています。

商品は発売・再販・終売で入れ替わります。初期検索候補として使用し、目撃投稿が集まらない古い商品は管理運用で整理してください。

## 出典

- ガシャポン公式店舗検索: https://gashapon.jp/shop/
- ガチャガチャの森店舗一覧: https://www.gachagachanomori.com/shoplist/
- #C-pla店舗一覧: https://toshin.jpn.com/shop/
- ドリームカプセル店舗一覧: https://www.dreamcapsule.co.jp/shop/
- イオン店舗検索: https://www.aeonretail.jp/shop/
- イトーヨーカドー店舗検索: https://stores.itoyokado.co.jp/
- ヨドバシカメラ店舗一覧: https://www.yodobashi.com/ec/store/list/
- ビックカメラ店舗一覧: https://www.biccamera.com/bc/i/shop/shoplist/
- ドン・キホーテ店舗検索: https://www.donki.com/store/
- アニメイト店舗一覧: https://www.animate.co.jp/shop/
- TSUTAYA店舗検索: https://store-tsutaya.tsite.jp/
- ヴィレッジヴァンガード店舗検索: https://www.village-v.co.jp/shopsearch/
- バンダイ ガシャポン商品情報: https://gashapon.jp/schedule/
- 国土地理院住所検索API: https://msearch.gsi.go.jp/address-search/
