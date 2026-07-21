import Link from "next/link";
import { VerificationBadge } from "@/components/VerificationBadge";
import { formatSightingDate, statusLabel, statusTone } from "@/lib/domain/sightings";
import type { GachaLocation, Sighting } from "@/lib/domain/types";

export function SightingLocationCard({ location, latest }: { location: GachaLocation; latest: Sighting }) {
  return (
    <article className="rounded-3xl bg-white p-5 shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/locations/${location.id}`} className="font-black underline decoration-yellow-300 decoration-4 underline-offset-4">{location.name}</Link>
          {location.address && <p className="mt-2 text-xs leading-5 text-zinc-500">{location.address}</p>}
        </div>
        <VerificationBadge status={location.verification_status} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone(latest.status)}`}>{statusLabel(latest.status)}</span>
        <span className="text-xs font-bold text-zinc-500">最終目撃：{formatSightingDate(latest.sighted_at)}</span>
      </div>
      {location.verification_status !== "confirmed" && <p className="mt-3 text-xs font-bold leading-5 text-amber-700">店舗マスタ上は設置候補です。上記は実際の目撃投稿に基づく情報ですが、現在の在庫を保証するものではありません。</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href={`/sightings/${latest.id}`} className="rounded-full bg-zinc-100 px-4 py-3 text-center text-sm font-black">目撃詳細</Link>
        <Link href={`/post?product=${encodeURIComponent(latest.product_id || latest.products?.id || "")}&location=${encodeURIComponent(location.id)}`} className="rounded-full bg-pink-500 px-4 py-3 text-center text-sm font-black text-white">今見た！</Link>
      </div>
    </article>
  );
}
