// Haversine distance — km between two lat/lng points.
import type { GeoCoords } from "./types";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: GeoCoords, b: GeoCoords): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number, lang: "uz" | "ru" | "en"): string {
  if (km < 1) {
    const m = Math.round(km * 1000);
    return lang === "ru" ? `${m} м` : lang === "en" ? `${m} m` : `${m} m`;
  }
  const k = km.toFixed(1);
  return lang === "ru" ? `${k} км` : lang === "en" ? `${k} km` : `${k} km`;
}

// Build deep links to map providers. Yandex Maps is more popular in
// Uzbekistan; Google Maps is the global standard.
export function yandexMapUrl(lat: number, lng: number, label?: string): string {
  // Yandex 'pt' takes lng,lat order (long-standing quirk)
  const base = `https://yandex.com/maps/?pt=${lng},${lat}&z=16&l=map`;
  return label ? `${base}&text=${encodeURIComponent(label)}` : base;
}

export function googleMapUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

