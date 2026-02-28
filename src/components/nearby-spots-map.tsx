"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const MAP_OPTIONS = [
  { id: "instrument" as const, label: "近くの楽器屋を探す", query: "楽器店" },
  { id: "livehouse" as const, label: "近くのライブハウスを探す", query: "ライブハウス" },
] as const;

const ZOOM_NEARBY = 15;

/** 緯度経度から市区町村名を取得（Nominatim 逆ジオコーディング）。日本で「〇〇県」「〇〇市」などが取れればマップ検索が安定する */
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

function getEmbedUrl(query: string, placeName: string | null): string {
  const base = "https://www.google.com/maps?output=embed";
  // 地名（例: 埼玉県 さいたま市）＋ 検索語 にすると、その地域で検索され表示が安定する
  const searchQuery = placeName ? `${query} ${placeName}` : `日本 ${query}`;
  const q = encodeURIComponent(searchQuery);
  const zoomParam = placeName ? `&z=${ZOOM_NEARBY}` : "";
  return `${base}&q=${q}${zoomParam}`;
}

export function NearbySpotsMap() {
  const [active, setActive] = useState<"instrument" | "livehouse">("instrument");
  const [placeName, setPlaceName] = useState<string | null>(null);
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
  const embedSrc = getEmbedUrl(current.query, placeName);

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
          className="absolute inset-0 block h-full w-full min-h-[280px]"
        />
      </div>
    </div>
  );
}
