# 公式店舗バックフィル

既存locationsを読み取り、公式店舗一覧から候補CSV・非破壊SQL・監査レポートを生成します。この処理はSupabaseへ書き込みません。

```bash
npm run locations:backfill
npm run locations:backfill:audit
```

取得HTML/JSONは `data/location-backfill/html/` にキャッシュされます。外部アクセスできない場合は次で再生成できます。

```bash
npm run locations:backfill:offline
```

登録時は先に `supabase/migrations/20260722_location_backfill_metadata.sql` を実行し、監査後に `supabase/seeds/20260722_location_backfill_candidates.sql` を実行します。収集スクリプト自体はどちらも実行しません。

confirmedは公式ガチャ店舗一覧への掲載が確認できた店舗だけです。大型店の公式店舗一覧だけを根拠にする入力はcandidateとし、ガチャ設置を推測しません。

座標は、バンダイ公式API、gashacoco公式詳細のJSON-LD、ヤマダデンキ公式詳細の地図座標の順で取得します。公式情報に座標がない候補だけ国土地理院の住所検索APIへ250ms間隔で問い合わせ、応答住所が都道府県・市区町村と一致する場合だけ採用します。応答は `data/location-backfill/html/gsi/` にキャッシュされ、オフライン再生成ではキャッシュだけを読みます。低精度・住所不一致の結果は採用せず監査レポートに残します。

`coordinate_source` と `coordinate_checked_at` に座標の根拠と確認日を保存します。30m以内の候補は監査対象にしますが、同じ施設内の別ブランド・別テナントを自動統合しません。重複除外は公式店舗ID、公式URL、または正規化した同一店舗名＋同一住所だけです。
