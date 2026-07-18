# 504店舗の投入手順

`schema-v8-location-master.sql` が成功した後、Supabase SQL Editorで次の順番で実行します。

1. `migrations/20260718_v8_seed_compatibility.sql`
2. `seeds/20260718_verified_catalog.sql`
3. `seeds/20260718_gashapon_department_expansion.sql`
4. `seeds/20260718_cpla_expansion.sql`
5. `seeds/20260718_dream_capsule_expansion.sql`
6. `seeds/20260718_verify_504_locations.sql`

互換マイグレーションは既存行を保持したまま不足列と `products` テーブルを追加します。2〜5は `DELETE`、`TRUNCATE` を使用せず、店舗名と住所が一致する既存行をスキップします。6の結果で各チェーンの `ready` がすべて `true`、合計が504件以上なら投入完了です。ユーザー登録店舗などが存在する場合、データベース全体の店舗数は504件より多くなります。
