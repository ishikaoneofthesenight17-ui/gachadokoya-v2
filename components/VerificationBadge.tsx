import type { VerificationStatus } from "@/lib/domain/types";

export function VerificationBadge({ status }: { status?: VerificationStatus | null }) {
  if (status === "confirmed") {
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">✓ 確認済み</span>;
  }
  return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">設置候補</span>;
}
