"use client";

import Link from "next/link";
import { ExternalLink, MapPin, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Spot } from "@/lib/types";
import StatusBadge from "./StatusBadge";

export default function DetailDrawer({ spot, onClose }: { spot: Spot | null; onClose: () => void }) {
  const [saved, setSaved] = useState(false);
  const [helped, setHelped] = useState(false);

  useEffect(() => {
    if (!spot) return;
    const favorites = JSON.parse(localStorage.getItem("gachadokoya_favorites") || "[]") as string[];
    const helpedIds = JSON.parse(localStorage.getItem("gachadokoya_helped") || "[]") as string[];
    setSaved(favorites.includes(spot.id));
    setHelped(helpedIds.includes(spot.id));
  }, [spot]);

  if (!spot) return null;
  const activeSpot = spot;

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${activeSpot.lat},${activeSpot.lng}`;
  const postUrl = `/post?product=${encodeURIComponent(activeSpot.product_id || "")}&location=${encodeURIComponent(activeSpot.location_id || "")}`;

  function toggleStorage(key: string, active: boolean, setter: (next: boolean) => void) {
    const current = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    const next = active ? current.filter((id) => id !== activeSpot.id) : [activeSpot.id, ...current];
    localStorage.setItem(key, JSON.stringify(next));
    setter(!active);
  }

  async function share() {
    const text = `${activeSpot.product_name}を${activeSpot.shop_name}で目撃！ #ガチャドコヤ`;
    if (navigator.share) {
      try { await navigator.share({ title: "ガチャドコヤ", text, url: location.href }); } catch {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${location.href}`);
      alert("リンクをコピーしました");
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <button className="icon-button drawer-close" onClick={onClose}><X /></button>
        <div className="drawer-visual">🎁</div>
        <StatusBadge status={activeSpot.status} />

        {activeSpot.product_id ? (
          <h2><Link href={`/products/${activeSpot.product_id}`} className="drawer-link">{activeSpot.product_name}</Link></h2>
        ) : <h2>{activeSpot.product_name}</h2>}

        {activeSpot.location_id ? (
          <p className="drawer-shop"><Link href={`/locations/${activeSpot.location_id}`} className="drawer-link">{activeSpot.shop_name}</Link></p>
        ) : <p className="drawer-shop">{activeSpot.shop_name}</p>}

        <p className="drawer-address"><MapPin size={17} />{activeSpot.address}</p>
        <dl className="detail-list">
          <div><dt>メーカー</dt><dd>{activeSpot.maker || "未登録"}</dd></div>
          <div><dt>ジャンル</dt><dd>{activeSpot.category || "未登録"}</dd></div>
          <div><dt>価格</dt><dd>{activeSpot.price ? `${activeSpot.price}円` : "未登録"}</dd></div>
          <div><dt>最終目撃</dt><dd>{new Date(activeSpot.witnessed_at).toLocaleString("ja-JP")}</dd></div>
        </dl>
        {activeSpot.comment && <div className="comment-box"><b>目撃コメント</b><p>{activeSpot.comment}</p></div>}

        <div className="drawer-action-grid">
          <button onClick={() => toggleStorage("gachadokoya_favorites", saved, setSaved)}>{saved ? "★ 保存済み" : "☆ 保存"}</button>
          <button onClick={() => toggleStorage("gachadokoya_helped", helped, setHelped)} className={helped ? "helped" : ""}>{helped ? "助かった！済み" : "助かった！"}</button>
          <button onClick={share}><Share2 size={16}/>共有</button>
          <Link href={postUrl}>今見た！</Link>
        </div>

        <a className="primary-button full" href={mapUrl} target="_blank" rel="noreferrer">Googleマップで開く <ExternalLink size={16} /></a>
      </aside>
    </div>
  );
}
