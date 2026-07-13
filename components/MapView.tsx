"use client";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import type { Spot } from "@/lib/types";
import StatusBadge from "./StatusBadge";

const icon = L.divIcon({ className: "gacha-pin", html: "<div>●</div>", iconSize: [34, 42], iconAnchor: [17, 38] });

function Recenter({ spots }: { spots: Spot[] }) {
  const map = useMap();
  useEffect(() => {
    if (!spots.length) return;
    const bounds = L.latLngBounds(spots.map((s) => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [spots, map]);
  return null;
}

export default function MapView({ spots, onSelect }: { spots: Spot[]; onSelect: (spot: Spot) => void }) {
  return (
    <MapContainer center={[35.6812, 139.7671]} zoom={11} scrollWheelZoom className="map">
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Recenter spots={spots} />
      {spots.map((spot) => (
        <Marker key={spot.id} position={[spot.lat, spot.lng]} icon={icon} eventHandlers={{ click: () => onSelect(spot) }}>
          <Popup><strong>{spot.product_name}</strong><br />{spot.shop_name}<br /><StatusBadge status={spot.status} /></Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
