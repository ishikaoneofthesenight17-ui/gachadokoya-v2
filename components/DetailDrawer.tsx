"use client";
import { ExternalLink, MapPin, X } from "lucide-react";
import type { Spot } from "@/lib/types";
import StatusBadge from "./StatusBadge";

export default function DetailDrawer({ spot, onClose }: { spot: Spot | null; onClose: () => void }) {
  if (!spot) return null;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <button className="icon-button drawer-close" onClick={onClose}><X /></button>
        <div className="drawer-visual">🎁</div>
        <StatusBadge status={spot.status} />
        <h2>{spot.product_name}</h2>
        <p className="drawer-shop">{spot.shop_name}</p>
        <p className="drawer-address"><MapPin size={17} />{spot.address}</p>
        <dl className="detail-list">
          <div><dt>メーカー</dt><dd>{spot.maker || "未登録"}</dd></div>
          <div><dt>ジャンル</dt><dd>{spot.category || "未登録"}</dd></div>
          <div><dt>価格</dt><dd>{spot.price ? `${spot.price}円` : "未登録"}</dd></div>
          <div><dt>最終目撃</dt><dd>{new Date(spot.witnessed_at).toLocaleString("ja-JP")}</dd></div>
        </dl>
        {spot.comment && <div className="comment-box"><b>目撃コメント</b><p>{spot.comment}</p></div>}
        <a className="primary-button full" href={mapUrl} target="_blank" rel="noreferrer">Googleマップで開く <ExternalLink size={16} /></a>
      </aside>
    </div>
  );
}
