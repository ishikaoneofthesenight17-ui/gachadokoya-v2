# 保存HTML

`npm run catalog:backfill` が公式ページのHTMLをメーカー別に保存するキャッシュ領域です。HTML本体は容量と更新頻度のためGit管理しません。外部アクセスできない環境へ持ち込む場合は、このディレクトリ構造を保ったまま別経路でコピーし、`npm run catalog:backfill:offline` を実行してください。
