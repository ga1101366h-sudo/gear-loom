"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const MAP_OPTIONS = [
  { id: "instrument" as const, label: "近くの楽器屋を探す", query: "楽器店" },
  { id: "livehouse" as const, label: "近くのライブハウスを探す", query: "ライブハウス" },
] as const;

/** デフォルト縮尺（小さいほど広い）。13＝市〜県レベル */
const ZOOM_DEFAULT = 13;

/** 緯度経度から市区町村名を取得（Nominatim 逆ジオコーディング） */
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja`;
    const res = await fetch(url, {
      headers: {
        "Accept-Language": "ja",
        "User-Agent": "Gear-Loom/1.0 (https://github.com/gear-loom)",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: { state?: string; prefecture?: string; city?: string; town?: string; village?: string; municipality?: string };
    };
    const a = data?.address;
    if (!a) return null;
    const parts = [
      a.state ?? a.prefecture,
      a.city ?? a.town ?? a.village ?? a.municipality,
    ].filter(Boolean) as string[];
    return parts.length > 0 ? parts.join(" ") : null;
  } catch {
    return null;
  }
}

/**
 * 埋め込みURLを生成。
 * 座標がある場合は ll と z で中心・縮尺を固定し、q は検索語のみにする。
 * これで「楽器屋」「ライブハウス」を切り替えても位置が変わらない。
 */
function getEmbedUrl(
  query: string,
  placeName: string | null,
  coords: { lat: number; lng: number } | null
): string {
  const base = "https://www.google.com/maps?output=embed";
  if (coords) {
    const ll = `&ll=${coords.lat},${coords.lng}`;
    const z = `&z=${ZOOM_DEFAULT}`;
    const q = `&q=${encodeURIComponent(query)}`;
    return `${base}${ll}${z}${q}`;
  }
  const searchQuery = placeName ? `${query} ${placeName}` : `日本 ${query}`;
  const q = `&q=${encodeURIComponent(searchQuery)}`;
  const zoomParam = placeName ? `&z=${ZOOM_DEFAULT}` : "";
  return `${base}${q}${zoomParam}`;
}

export function NearbySpotsMap() {
  const [active, setActive] = useState<"instrument" | "livehouse">("instrument");
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"loading" | "ok" | "denied" | "error">("loading");

  useEffect(() => {
    if (!navigator?.geolocation) {
      setLocationStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        const name = await reverseGeocode(lat, lng);
        setPlaceName(name);
        setLocationStatus("ok");
      },
      () => {
        setLocationStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const current = MAP_OPTIONS.find((o) => o.id === active) ?? MAP_OPTIONS[0];
  const embedSrc = getEmbedUrl(current.query, placeName, coords);

  return (
    <div className="space-y-4 w-full min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        {MAP_OPTIONS.map((opt) => (
          <Button
            key={opt.id}
            variant={active === opt.id ? "default" : "secondary"}
            size="sm"
            onClick={() => setActive(opt.id)}
            aria-pressed={active === opt.id}
            className="min-h-[44px] touch-manipulation"
          >
            {opt.label}
          </Button>
        ))}
        <span className="text-xs text-gray-500">
          {locationStatus === "loading" && "現在地を取得中…"}
          {locationStatus === "ok" && "現在地付近で表示中"}
          {(locationStatus === "denied" || locationStatus === "error") &&
            "位置情報をオフにしているため日本全体で表示しています"}
        </span>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-surface-border bg-surface-card/80 w-full min-w-0 aspect-[4/3] sm:aspect-[16/10] max-h-[70vh] sm:max-h-[420px]">
        <iframe
          src={embedSrc}
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={current.label}
          className="absolute inset-0 block h-full w-full min-h-[280px] filter invert-[100%] hue-rotate-180 brightness-90 contrast-90"
        />
      </div>
    </div>
  );
}
