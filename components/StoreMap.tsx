"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
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
  const storeMarkersRef = useRef<LayerGroup | null>(null);
  const currentLocationMarkerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const initializationGenerationRef = useRef(0);
  const [mapGeneration, setMapGeneration] = useState(0);

  useEffect(() => {
    const generation = initializationGenerationRef.current + 1;
    initializationGenerationRef.current = generation;
    let disposed = false;

    async function initializeMap() {
      const L = await import("leaflet");
      const container = containerRef.current;
      if (disposed || generation !== initializationGenerationRef.current || !container || mapRef.current) return;

      // HMR can leave Leaflet's private container id behind after the old
      // module instance is discarded. Only clear it when no live map exists.
      const leafletContainer = container as HTMLDivElement & { _leaflet_id?: number };
      if (leafletContainer._leaflet_id) {
        container.replaceChildren();
        delete leafletContainer._leaflet_id;
      }

      const map = L.map(container, { preferCanvas: true, zoomAnimation: false }).setView([36.2, 138.2], 5);
      if (disposed || generation !== initializationGenerationRef.current) {
        safelyRemoveMap(map);
        return;
      }

      leafletRef.current = L;
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      storeMarkersRef.current = L.layerGroup().addTo(map);
      currentLocationMarkerRef.current = L.layerGroup().addTo(map);
      setMapGeneration(generation);
    }

    initializeMap();
    return () => {
      disposed = true;
      initializationGenerationRef.current += 1;
      const map = mapRef.current;
      mapRef.current = null;
      storeMarkersRef.current = null;
      currentLocationMarkerRef.current = null;
      leafletRef.current = null;
      if (map) safelyRemoveMap(map);
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = storeMarkersRef.current;
    if (!mapGeneration || !L || !layer) return;
    layer.clearLayers();
    for (const location of locations) {
      if (typeof location.latitude !== "number" || typeof location.longitude !== "number") continue;
      const popup = document.createElement("div");
      popup.innerHTML = `<strong>${escapeHtml(location.name)}</strong><br><span>${escapeHtml(location.address ?? "")}</span><br><a href="/locations/${encodeURIComponent(location.id)}">店舗詳細を見る</a>`;
      L.circleMarker([location.latitude, location.longitude], { radius: 6, color: "#be185d", weight: 2, fillColor: "#ec4899", fillOpacity: 0.8 })
        .bindPopup(popup)
        .addTo(layer);
    }
  }, [locations, mapGeneration]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = currentLocationMarkerRef.current;
    if (!mapGeneration || !L || !layer) return;
    layer.clearLayers();
    if (currentCoordinates) {
      L.circleMarker([currentCoordinates.latitude, currentCoordinates.longitude], { radius: 10, color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 })
        .bindPopup("現在地")
        .addTo(layer);
    }
  }, [currentCoordinates, mapGeneration]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapGeneration || !map) return;
    const bounds: [number, number][] = locations.flatMap((location) =>
      typeof location.latitude === "number" && typeof location.longitude === "number"
        ? [[location.latitude, location.longitude] as [number, number]]
        : []
    );
    if (currentCoordinates) bounds.push([currentCoordinates.latitude, currentCoordinates.longitude]);
    if (bounds.length > 0) map.fitBounds(bounds, { padding: [20, 20], animate: false });
  }, [currentCoordinates, locations, mapGeneration]);

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

function safelyRemoveMap(map: LeafletMap) {
  try {
    map.stop();
    map.remove();
  } catch (error) {
    // Strict Mode and HMR may already have detached the container. Cleanup is
    // intentionally idempotent so an obsolete instance cannot break the next.
    console.debug("Leaflet map was already detached", error);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);
}
