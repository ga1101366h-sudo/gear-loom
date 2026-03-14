"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";

type BoardImagesViewerProps = {
  actualPhotoUrl: string | null;
  thumbnailUrl: string | null;
};

export function BoardImagesViewer({
  actualPhotoUrl,
  thumbnailUrl,
}: BoardImagesViewerProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasActual = Boolean(actualPhotoUrl);
  const hasThumbnail = Boolean(thumbnailUrl);

  const openLightbox = (src: string, alt: string) => {
    setLightboxSrc(src);
    setLightboxAlt(alt);
  };

  const closeLightbox = () => {
    setLightboxSrc(null);
    setLightboxAlt("");
  };

  if (!hasActual && !hasThumbnail) return null;

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-6">
        {hasActual && actualPhotoUrl && (
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => openLightbox(actualPhotoUrl, "実機写真")}
              className="relative w-full h-[320px] sm:h-[380px] md:h-[420px] rounded-lg overflow-hidden border border-surface-border bg-slate-900/60 cursor-zoom-in group"
            >
              <Image
                src={actualPhotoUrl}
                alt="実機写真"
                fill
                className="object-contain transition-opacity duration-200 group-hover:opacity-80"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </button>
          </div>
        )}
        {hasThumbnail && thumbnailUrl && (
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => openLightbox(thumbnailUrl, "配線図")}
              className="relative w-full h-[320px] sm:h-[380px] md:h-[420px] rounded-lg overflow-hidden border border-surface-border bg-slate-900/60 cursor-zoom-in group"
            >
              <Image
                src={thumbnailUrl}
                alt="配線図"
                fill
                className="object-contain transition-opacity duration-200 group-hover:opacity-80"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </button>
          </div>
        )}
      </div>

      {mounted &&
        lightboxSrc &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 cursor-pointer"
            onClick={closeLightbox}
          >
            <div
              className="relative max-w-5xl max-h-[90vh] w-full h-[min(80vh,80vw)]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={lightboxSrc}
                alt={lightboxAlt}
                fill
                className="object-contain cursor-pointer"
                sizes="(max-width: 1024px) 100vw, 1024px"
                priority
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
