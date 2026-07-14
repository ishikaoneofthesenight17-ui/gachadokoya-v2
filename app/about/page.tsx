import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-yellow-50 px-4 py-8 text-black">
      <article className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow">
        <Link href="/" className="text-sm font-black text-pink-500">← トップへ戻る</Link>
        <h1 className="mt-5 text-3xl font-black">ガチャドコヤについて</h1>
        <p className="mt-4 leading-7">
          欲しいカプセルトイがどこで目撃されたかを、みんなで共有する小さな検索サービスです。
        </p>
        <p className="mt-4 leading-7">
          情報を投稿すると、サブちゃんがランダムにお礼します。目撃情報は参考情報であり、実際の在庫を保証するものではありません。
        </p>
        <h2 className="mt-6 text-xl font-black">公開版の機能</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
          <li>商品名やキャラクター名などによる検索</li>
          <li>最終目撃日時と在庫状況の表示</li>
          <li>店舗情報とGoogleマップの表示</li>
          <li>目撃情報の投稿とサブちゃんのお礼ガチャ</li>
        </ul>
      </article>
    </main>
  );
}
