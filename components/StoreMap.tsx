"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { GachaLocation } from "@/lib/domain/types";

type Props = { locations: GachaLocation[] };

export function StoreMap({ locations }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function renderMap() {
      if (!containerRef.current) return;
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;
      mapRef.current?.remove();
      const map = L.map(containerRef.current, { preferCanvas: true }).setView([36.2, 138.2], 5);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      const bounds: [number, number][] = [];
      for (const location of locations) {
        if (typeof location.latitude !== "number" || typeof location.longitude !== "number") continue;
        const point: [number, number] = [location.latitude, location.longitude];
        bounds.push(point);
        const popup = document.createElement("div");
        popup.innerHTML = `<strong>${escapeHtml(location.name)}</strong><br><span>${escapeHtml(location.address ?? "")}</span><br><a href="/locations/${encodeURIComponent(location.id)}">店舗詳細を見る</a>`;
        L.circleMarker(point, { radius: 6, color: "#be185d", weight: 2, fillColor: "#ec4899", fillOpacity: 0.8 })
          .bindPopup(popup)
          .addTo(map);
      }
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [20, 20] });
    }
    renderMap();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [locations]);

  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-lg">
      <div ref={containerRef} className="h-[60vh] min-h-96 w-full" aria-label={`${locations.length}店舗の地図`} />
      <div className="flex items-center justify-between gap-3 p-4 text-sm font-bold">
        <span>{locations.length}店舗を表示中</span>
        <Link href="/locations/new" className="text-pink-600">地図にない店舗を登録</Link>
      </div>
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);
}
