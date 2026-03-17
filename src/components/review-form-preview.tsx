"use client";

import Image from "next/image";
import { shouldUnoptimizeImage } from "@/lib/image-optimization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getFirebaseStorageUrl } from "@/lib/utils";

const SITUATION_LABELS: Record<string, string> = {
  home: "自宅・宅録",
  studio: "スタジオ",
  livehouse: "ライブハウス",
  streaming: "配信",
};

export type ReviewPreviewData = {
  title: string;
  categoryNameJa: string;
  gearName: string;
  makerName: string;
  rating: number;
  bodyMd: string;
  situations: string[];
  youtubeUrl: string;
  existingImagePaths?: { storage_path: string; sort_order: number }[];
  newImageUrls?: string[];
  isContentOnlyCategory?: boolean;
};

type Props = {
  data: ReviewPreviewData;
  onClose: () => void;
};

export function ReviewFormPreview({ data, onClose }: Props) {
  const {
    title,
    categoryNameJa,
    gearName,
    makerName,
    rating,
    bodyMd,
    situations,
    youtubeUrl,
    existingImagePaths = [],
    newImageUrls = [],
    isContentOnlyCategory,
  } = data;

  const existingImages = [...existingImagePaths].sort((a, b) => a.sort_order - b.sort_order);
  const allImageUrls = [
    ...existingImages.map((img) => getFirebaseStorageUrl(img.storage_path)),
    ...(newImageUrls ?? []),
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-surface-dark border border-surface-border rounded-xl max-h-[90vh] overflow-y-auto max-w-2xl w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex justify-between items-center p-3 border-b border-surface-border bg-surface-dark z-10">
          <span className="text-sm font-medium text-gray-300">投稿プレビュー</span>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        <div className="p-4">
          <Card>
            <CardHeader className="space-y-2">
              <CardDescription className="text-electric-blue">{categoryNameJa || "カテゴリ"}</CardDescription>
              <CardTitle className="text-xl">{title || "（タイトル未入力）"}</CardTitle>
              {!isContentOnlyCategory && (
                <div className="flex flex-col gap-0.5 text-gray-300">
                  {makerName && <p className="text-sm text-gray-400">{makerName}</p>}
                  {gearName && <p className="text-lg">{gearName}</p>}
                </div>
              )}
              {situations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {situations.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-electric-blue/40 bg-electric-blue/10 px-2.5 py-0.5 text-[11px] text-electric-blue"
                    >
                      {SITUATION_LABELS[s] ?? s}
                    </span>
                  ))}
                </div>
              )}
              {!isContentOnlyCategory && rating > 0 && (
                <span className="flex gap-0.5 text-electric-blue text-lg" aria-label={`${rating}点`}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={i <= rating ? "opacity-100" : "opacity-30"}>
                      ★
                    </span>
                  ))}
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {allImageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allImageUrls.map((url, i) => (
                    <div key={i} className="relative w-32 h-32 rounded-lg overflow-hidden bg-surface-card">
                      <Image
                        src={url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="128px"
                        unoptimized={shouldUnoptimizeImage(url)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {youtubeUrl && (
                <p className="text-sm text-gray-400">
                  📎 YouTube 埋め込み: {youtubeUrl}
                </p>
              )}
              {bodyMd ? (
                <div className="text-sm text-gray-100 whitespace-pre-wrap leading-relaxed">
                  {bodyMd}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">（本文未入力）</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
