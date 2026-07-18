import type { Coordinates, GachaLocation, Product, Sighting, StockStatus } from "./types";

const STATUS_LABELS: Record<StockStatus, string> = {
  plenty: "残り多そう",
  available: "まだあった",
  low: "少なそう",
  sold_out: "なかった",
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status as StockStatus] ?? status;
}

export function statusTone(status: string) {
  if (status === "sold_out") return "bg-zinc-200 text-zinc-700";
  if (status === "low") return "bg-orange-100 text-orange-700";
  if (status === "plenty") return "bg-emerald-100 text-emerald-700";
  return "bg-pink-100 text-pink-600";
}

export function formatSightingDate(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function elapsedHours(value: string) {
  return Math.max(0, (Date.now() - new Date(value).getTime()) / 3_600_000);
}

export function likelihoodScore(item: Pick<Sighting, "status" | "sighted_at">) {
  let score = item.status === "plenty" ? 86 : item.status === "available" ? 72 : item.status === "low" ? 38 : 8;
  const hours = elapsedHours(item.sighted_at);
  if (hours <= 1) score += 8;
  else if (hours <= 6) score += 2;
  else if (hours <= 24) score -= 6;
  else if (hours <= 72) score -= 18;
  else score -= 32;
  return Math.min(95, Math.max(3, Math.round(score)));
}

export function likelihoodText(score: number) {
  if (score >= 75) return "かなりありそう";
  if (score >= 50) return "ありそう";
  if (score >= 25) return "低め";
  return "かなり低め";
}

export function likelihoodTone(score: number) {
  if (score >= 75) return "bg-emerald-500 text-white";
  if (score >= 50) return "bg-yellow-300 text-zinc-900";
  if (score >= 25) return "bg-orange-400 text-white";
  return "bg-zinc-400 text-white";
}

export function distanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const latitudeDelta = ((to.latitude - from.latitude) * Math.PI) / 180;
  const longitudeDelta = ((to.longitude - from.longitude) * Math.PI) / 180;
  const latitude1 = (from.latitude * Math.PI) / 180;
  const latitude2 = (to.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function productMetadata(product?: Product | null) {
  return [product?.work_title, product?.character_name, product?.genre, product?.creator, product?.maker]
    .filter(Boolean)
    .join(" / ");
}

export function googleMapsUrls(location?: GachaLocation | null) {
  if (!location) return null;
  const query =
    typeof location.latitude === "number" && typeof location.longitude === "number"
      ? `${location.latitude},${location.longitude}`
      : location.address || location.name;
  const encodedQuery = encodeURIComponent(query);
  return {
    embed: `https://www.google.com/maps?q=${encodedQuery}&output=embed`,
    open: `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`,
  };
}
