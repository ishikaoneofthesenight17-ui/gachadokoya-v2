"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { GachaLocation } from "@/lib/domain/types";

export function ProductSightingMap({ locations }: { locations: GachaLocation[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    let disposed = false;
    async function initialize() {
      const L = await import("leaflet");
      const container = containerRef.current;
      if (disposed || generation !== generationRef.current || !container || mapRef.current) return;
      const leafletContainer = container as HTMLDivElement & { _leaflet_id?: number };
      if (leafletContainer._leaflet_id) { container.replaceChildren(); delete leafletContainer._leaflet_id; }
      const map = L.map(container, { preferCanvas: true, zoomAnimation: false });
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 }).addTo(map);
      const bounds: [number, number][] = [];
      for (const location of locations) {
        if (typeof location.latitude !== "number" || typeof location.longitude !== "number") continue;
        const point: [number, number] = [location.latitude, location.longitude];
        bounds.push(point);
        const confirmed = location.verification_status === "confirmed";
        L.circleMarker(point, { radius: 7, color: confirmed ? "#047857" : "#b45309", weight: 2, fillColor: confirmed ? "#10b981" : "#f59e0b", fillOpacity: 0.85 })
          .bindPopup(`<strong>${escapeHtml(location.name)}</strong><br>${confirmed ? "確認済み" : "設置候補"}`)
          .addTo(map);
      }
      if (bounds.length) map.fitBounds(bounds, { padding: [20, 20], animate: false, maxZoom: 15 });
    }
    initialize();
    return () => {
      disposed = true;
      generationRef.current += 1;
      const map = mapRef.current;
      mapRef.current = null;
      if (map) { try { map.stop(); map.remove(); } catch { /* already detached by HMR */ } }
    };
  }, [locations]);

  return <div ref={containerRef} className="h-72 w-full rounded-3xl" aria-label={`${locations.length}件の目撃店舗地図`} />;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);
}
