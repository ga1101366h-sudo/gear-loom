"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const MAP_OPTIONS = [
  { id: "instrument" as const, label: "近くの楽器屋を探す", query: "楽器店" },
  { id: "livehouse" as const, label: "近くのライブハウスを探す", query: "ライブハウス" },
] as const;

function getEmbedUrl(query: string): string {
  const base = "https://www.google.com/maps?output=embed";
  const q = encodeURIComponent(query);
  return `${base}&q=${q}`;
}

export function NearbySpotsMap() {
  const [active, setActive] = useState<"instrument" | "livehouse">("instrument");
  const current = MAP_OPTIONS.find((o) => o.id === active) ?? MAP_OPTIONS[0];
  const embedSrc = getEmbedUrl(current.query);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {MAP_OPTIONS.map((opt) => (
          <Button
            key={opt.id}
            variant={active === opt.id ? "default" : "secondary"}
            size="sm"
            onClick={() => setActive(opt.id)}
            aria-pressed={active === opt.id}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-surface-border bg-surface-card/80">
        <iframe
          src={embedSrc}
          width="100%"
          height="400"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={current.label}
          className="block w-full min-h-[320px] md:min-h-[400px]"
        />
      </div>
    </div>
  );
}
