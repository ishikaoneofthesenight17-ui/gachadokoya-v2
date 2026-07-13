import type { StockStatus } from "@/lib/types";

const meta: Record<StockStatus, { label: string; icon: string }> = {
  found: { label: "あった", icon: "●" },
  low: { label: "残り少なめ", icon: "▲" },
  soldout: { label: "なかった", icon: "×" },
  unknown: { label: "不明", icon: "?" },
};

export default function StatusBadge({ status }: { status: StockStatus }) {
  const item = meta[status];
  return <span className={`status status-${status}`}>{item.icon} {item.label}</span>;
}
