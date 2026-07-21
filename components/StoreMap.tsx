"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { GachaLocation } from "@/lib/domain/types";
import type { Coordinates } from "@/lib/domain/types";

type Props = {
  locations: GachaLocation[];
  currentCoordinates: Coordinates | null;
  locationMessage: string;
  onBack: () => void;
  onRetryLocation: () => void;
};

export function StoreMap({ locations, currentCoordinates, locationMessage, onBack, onRetryLocation }: Props) {
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
      if (currentCoordinates) {
        const currentPoint: [number, number] = [currentCoordinates.latitude, currentCoordinates.longitude];
        bounds.push(currentPoint);
        L.circleMarker(currentPoint, { radius: 10, color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 })
          .bindPopup("現在地")
          .addTo(map);
      }
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [20, 20] });
    }
    renderMap();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [currentCoordinates, locations]);

  const locationFailed = !currentCoordinates && locationMessage && locationMessage !== "現在地を取得中...";

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-white shadow-lg">
      <div className="absolute inset-x-3 top-3 z-[1000] flex items-start justify-between gap-2 pointer-events-none">
        <button type="button" onClick={onBack} className="pointer-events-auto rounded-full bg-white px-4 py-3 text-sm font-black shadow-lg">← 一覧へ戻る</button>
        {locationFailed && <button type="button" onClick={onRetryLocation} className="pointer-events-auto rounded-full bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg">現在地を取得する</button>}
      </div>
      <div ref={containerRef} className="h-[60vh] min-h-96 w-full" aria-label={`${locations.length}店舗の地図`} />
      <div className="flex items-center justify-between gap-3 p-4 text-sm font-bold">
        <span>{locations.length}店舗を表示中{currentCoordinates ? "・現在地を青で表示" : ""}</span>
        <Link href="/locations/new" className="text-pink-600">地図にない店舗を登録</Link>
      </div>
      {locationMessage && <p className="px-4 pb-4 text-xs font-bold text-zinc-500">{locationMessage}</p>}
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);
}
