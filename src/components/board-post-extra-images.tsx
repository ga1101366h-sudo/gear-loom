"use client";

import { useState } from "react";
import Image from "next/image";
import { X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type BoardPostExtraImagesProps = {
  imageUrls: string[];
};

export function BoardPostExtraImages({ imageUrls }: BoardPostExtraImagesProps) {
  const validUrls = imageUrls.filter((u) => typeof u === "string" && u.trim());
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (validUrls.length === 0) return null;

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          ギャラリー
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {validUrls.map((url, idx) => (
            <button
              key={`${url}-${idx}`}
              type="button"
              onClick={() => setLightboxSrc(url)}
              className="relative w-full h-32 sm:h-36 md:h-40 rounded-lg overflow-hidden border border-surface-border bg-slate-900/60 cursor-zoom-in group"
            >
              <Image
                src={url}
                alt=""
                fill
                className="object-cover transition-opacity duration-200 group-hover:opacity-80"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            </button>
          ))}
        </div>
      </section>

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <div
            className="relative w-full h-full max-w-[95vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxSrc(null)}
              className={cn(
                "absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full",
                "bg-black/60 text-gray-200 hover:bg-black/80 transition-colors border border-white/20",
              )}
              aria-label="閉じる"
            >
              <XIcon className="h-4 w-4" aria-hidden />
            </button>
            <div className="relative w-full h-full">
              <Image
                src={lightboxSrc}
                alt=""
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

