import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-yellow-50 px-4 py-8 text-black">
      <article className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow">
        <Link href="/" className="text-sm font-black text-pink-500">← トップへ戻る</Link>
        <h1 className="mt-5 text-3xl font-black">プライバシー</h1>
        <p className="mt-4 leading-7">
          現在地機能は、店舗との距離を計算するためにブラウザ上で使用します。現在地そのものをデータベースへ保存する処理はありません。
        </p>
        <p className="mt-4 leading-7">
          投稿時は、氏名・電話番号・メールアドレスなどの個人情報をコメント欄へ入力しないでください。
        </p>
        <p className="mt-4 leading-7">
          不適切な投稿や削除依頼への対応方法は、正式公開後に運営連絡先とあわせて追記します。
        </p>
      </article>
    </main>
  );
}
