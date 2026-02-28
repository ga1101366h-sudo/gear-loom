"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";

export type ReviewImageItem = {
  url: string;
};

export function ReviewImagesGallery({ images }: { images: ReviewImageItem[] }) {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <button
            key={img.url}
            type="button"
            onClick={() => setActiveUrl(img.url)}
            className="relative w-full max-w-xs aspect-video rounded-lg overflow-hidden bg-surface-card focus:outline-none focus:ring-2 focus:ring-electric-blue/60"
          >
            <Image
              src={img.url}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 384px) 100vw, 384px"
              unoptimized
            />
          </button>
        ))}
      </div>

      {mounted &&
        activeUrl &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4"
            onClick={() => setActiveUrl(null)}
          >
            <div
              className="relative max-w-5xl max-h-[90vh] w-full h-[min(80vh,80vw)]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={activeUrl}
                alt=""
                fill
                className="object-contain cursor-pointer"
                sizes="(max-width: 1024px) 100vw, 1024px"
                unoptimized
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

