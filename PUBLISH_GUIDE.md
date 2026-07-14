# ガチャドコヤ 公開手順（Vercel）

## 公開前の確認

1. 元のプロジェクトに `.env.local` が残っていることを確認します。
2. ターミナルで次を実行します。

```bash
npm install
npm run build
```

3. `npm run dev` で以下を一周確認します。
   - 「猫」「ネコ」「ねこ」で同じ結果が出る
   - 「アクキー」「アクリルキーホルダー」などの類義語が機能する
   - 検索結果カードから詳細ページへ移動できる
   - Googleマップが表示される
   - 投稿後にサブちゃんの画像と音声が出る

## GitHubへアップロード

Vercelで最も簡単に公開するにはGitHub連携を使います。

1. GitHubで空のリポジトリ `gachadokoya` を作成します。
2. VS Codeでプロジェクトを開き、ターミナルで以下を実行します。

```bash
git init
git add .
git commit -m "Public v1"
git branch -M main
git remote add origin <GitHubに表示されたリポジトリURL>
git push -u origin main
```

`.env.local` は `.gitignore` により通常アップロードされません。GitHub上に表示されていないことを必ず確認してください。

## Vercelで公開

1. VercelへGitHubアカウントでログインします。
2. `Add New...` → `Project` → `gachadokoya` を選びます。
3. Environment Variablesへ次の2つを登録します。

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

値は手元の `.env.local` からコピーします。Secret keyは登録しません。

4. `Deploy` を押します。
5. 発行された `https://...vercel.app` をスマホで開いて動作確認します。

## 公開後に必ず確認すること

- スマホから検索できる
- 位置情報の許可・拒否の両方で画面が壊れない
- 詳細ページの直接URLを開ける
- 投稿できる
- 音声が再生される（端末設定によって自動再生されない場合があります）
- SupabaseのSecret keyがコード・GitHub・画面に露出していない

## 表記ゆれ検索

公開版では次を自動吸収します。

- 全角／半角
- 大文字／小文字
- ひらがな／カタカナ
- 空白や一部記号
- 猫／ねこ／ネコ、犬／いぬ／イヌ
- キーホルダー／キーリング／チャーム
- アクキー／アクリルキーホルダー
- アクスタ／アクリルスタンド
- ぬい／ぬいぐるみ／マスコット
- ポーチ／小物入れ など
