"use client";
import { Clock3, MapPin, Store } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { Spot } from "@/lib/types";

function timeAgo(date: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

export default function SpotCard({ spot, onClick }: { spot: Spot; onClick: () => void }) {
  return (
    <button className="spot-card" onClick={onClick}>
      <div className="spot-card-top">
        <StatusBadge status={spot.status} />
        <span className="time"><Clock3 size={14} />{timeAgo(spot.witnessed_at)}</span>
      </div>
      <h3>{spot.product_name}</h3>
      <p className="shop"><Store size={16} />{spot.shop_name}</p>
      <p className="address"><MapPin size={15} />{spot.address}</p>
      <div className="chips">
        {spot.maker && <span>{spot.maker}</span>}
        {spot.category && <span>{spot.category}</span>}
        {spot.price && <span>{spot.price}円</span>}
      </div>
    </button>
  );
}
