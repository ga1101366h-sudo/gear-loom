"use client";

import { useState, useEffect } from "react";

const SLIDE_INTERVAL_MS = 6000;
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1514807469796-01d01b1e967a?auto=format&fit=crop&w=1920&q=80";

type Props = {
  imageUrls: string[];
  className?: string;
};

/** フルスクリーン背景スライドショー（フェード切り替え）。画像が0件のときはフォールバック1枚を表示 */
export function HeroSlideshow({ imageUrls, className = "" }: Props) {
  const sources =
    imageUrls.length > 0 ? imageUrls : [FALLBACK_IMAGE];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % sources.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [sources.length]);

  return (
    <div
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
      aria-hidden
    >
      {sources.map((url, i) => (
        <div
          key={url + i}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[1200ms] ease-in-out"
          style={{
            backgroundImage: `url(${url})`,
            opacity: i === index ? 1 : 0,
          }}
        />
      ))}
    </div>
  );
}
