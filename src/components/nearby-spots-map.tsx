"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const MAP_OPTIONS = [
  { id: "instrument" as const, label: "近くの楽器屋を探す", query: "楽器店" },
  { id: "livehouse" as const, label: "近くのライブハウスを探す", query: "ライブハウス" },
] as const;

function getEmbedUrl(query: string, center: { lat: number; lng: number } | null): string {
  const base = "https://www.google.com/maps?output=embed";
  // 現在地がある場合は「緯度,経度 検索語」でその付近を中心に検索（スマホ・PCとも同じ挙動に）
  const searchQuery = center
    ? `${center.lat},${center.lng} ${query}`
    : `日本 ${query}`;
  const q = encodeURIComponent(searchQuery);
  return `${base}&q=${q}`;
}

export function NearbySpotsMap() {
  const [active, setActive] = useState<"instrument" | "livehouse">("instrument");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"loading" | "ok" | "denied" | "error">("loading");

  useEffect(() => {
    if (!navigator?.geolocation) {
      setLocationStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus("ok");
      },
      () => {
        setLocationStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const current = MAP_OPTIONS.find((o) => o.id === active) ?? MAP_OPTIONS[0];
  const embedSrc = getEmbedUrl(current.query, location);

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
