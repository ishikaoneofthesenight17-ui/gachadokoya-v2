import Link from "next/link";

const actions = [
  {
    href: "/admin/locations",
    label: "店舗一覧",
    description: "登録済み店舗の確認、1件追加、CSV登録へ進みます。",
  },
  {
    href: "/admin/products",
    label: "商品一覧",
    description: "登録済み商品の確認、1件追加、CSV登録へ進みます。",
  },
  {
    href: "/admin/import",
    label: "店舗CSV登録",
    description: "店舗マスタをCSVから最大200件ずつ一括登録します。",
  },
  {
    href: "/admin/products/import",
    label: "商品CSV登録",
    description: "商品マスタをCSVから最大200件ずつ一括登録します。",
  },
] as const;

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-yellow-50 px-4 py-8 text-zinc-900">
      <section className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-black text-pink-500">← トップへ戻る</Link>
        <div className="mt-4 rounded-3xl bg-white p-6 shadow">
          <p className="text-sm font-black tracking-widest text-pink-500">ADMIN</p>
          <h1 className="mt-1 text-3xl font-black">管理メニュー</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            公開前のMVP用管理画面です。URLを知っている人は操作できるため、運営者だけで使用してください。
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {actions.map((action) => (
              <Link key={action.href} href={action.href} className="rounded-3xl border border-zinc-200 p-5 hover:border-pink-300 hover:bg-pink-50">
                <h2 className="text-xl font-black">{action.label}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
