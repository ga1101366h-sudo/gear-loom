"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { removeBackground, type Config } from "@imgly/background-removal";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Loader2, UploadCloud, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import type { GearData } from "@/types/gear";

type ProcessedImage = {
  originalUrl: string;
  processedUrl: string;
};

const MAX_IMAGE_SIZE = 400;
const WEBP_QUALITY = 0.8;

/** 背景透過済み画像を最大辺 400px・WebP 品質 0.8 に圧縮してストレージ節約 */
async function compressToWebp(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const w = bitmap.width;
  const h = bitmap.height;
  const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(w, h));
  const cw = Math.round(w * scale);
  const ch = Math.round(h * scale);

  const canvas = new OffscreenCanvas(cw, ch);
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;
  ctx.drawImage(bitmap, 0, 0, w, h, 0, 0, cw, ch);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.convertToBlob({ type: "image/webp", quality: WEBP_QUALITY })
      .then((b) => resolve(b))
      .catch(reject);
  });
}

type GearImageGeneratorInnerProps = {
  /** 既存機材の画像を上書きする場合に渡す Gear ID */
  initialGearId?: string | null;
  /** アップロード時に Authorization ヘッダーに付与するトークン取得関数 */
  getAuthToken?: () => Promise<string | null>;
  /** 保存成功時に API 返却の Gear のみ渡す。ローカル blob URL は一切渡さない（黒化防止） */
  onSuccess?: (gear: GearData, options: { isUpdate: boolean }) => void;
  /** モーダル/ドロワーを閉じる。保存成功後は必ず呼ぶこと（モバイルで閉じない不具合防止） */
  onClose?: () => void;
};

function GearImageGeneratorInner({ initialGearId, getAuthToken, onSuccess, onClose }: GearImageGeneratorInnerProps) {
  const [uploaded, setUploaded] = useState<ProcessedImage | null>(null);
  const [processedImageBlob, setProcessedImageBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const prevUrlsRef = useRef<{ original?: string; processed?: string }>({});

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    const file = acceptedFiles[0];
    if (prevUrlsRef.current.original) URL.revokeObjectURL(prevUrlsRef.current.original);
    if (prevUrlsRef.current.processed) URL.revokeObjectURL(prevUrlsRef.current.processed);
    prevUrlsRef.current = {};
    setUploaded(null);
    setProcessedImageBlob(null);
    setIsProcessing(true);

    const config: Config = {
      publicPath: `${typeof window !== "undefined" ? window.location.origin : ""}/static/imgly/`,
    };
    removeBackground(file, config)
      .then((blob: Blob) => {
        const processedUrl = URL.createObjectURL(blob);
        const originalUrl = URL.createObjectURL(file);
        prevUrlsRef.current = { original: originalUrl, processed: processedUrl };
        setUploaded({ originalUrl, processedUrl });
        setProcessedImageBlob(blob);
      })
      .catch((err) => {
        console.error("[background-removal]", err);
        setUploaded(null);
        setProcessedImageBlob(null);
      })
      .finally(() => {
        setIsProcessing(false);
      });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "image/*": [] },
  });

  useEffect(() => {
    return () => {
      if (prevUrlsRef.current.original) URL.revokeObjectURL(prevUrlsRef.current.original);
      if (prevUrlsRef.current.processed) URL.revokeObjectURL(prevUrlsRef.current.processed);
      prevUrlsRef.current = {};
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!processedImageBlob || isSubmitting) return;
      const gearId = initialGearId?.trim();
      if (!gearId) {
        setSubmitError("画像を機材に紐づけて保存するには、ボード上のノードの「設定」から開くか、所持機材を選択してからこの画面を開いてください。");
        return;
      }
      setSubmitError(null);
      setIsSubmitting(true);
      try {
        const compressedBlob = await compressToWebp(processedImageBlob);
        const formData = new FormData();
        formData.append("gearId", gearId);
        const imageFile = new File([compressedBlob], "gear.webp", { type: "image/webp" });
        formData.append("image", imageFile);

        const headers: HeadersInit = {};
        const token = getAuthToken ? await getAuthToken() : null;
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/gears/upload", {
          method: "POST",
          headers,
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "更新に失敗しました");
        }
        const gear = (await res.json()) as GearData;
        onSuccess?.(gear, { isUpdate: true });
        onClose?.();
      } catch (err) {
        console.error("[gear-image-generator] upload", err);
        const message = err instanceof Error ? err.message : "更新に失敗しました";
        setSubmitError(message);
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [initialGearId, processedImageBlob, isSubmitting, getAuthToken, onSuccess, onClose],
  );

  return (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-surface-border/60 pb-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">機材画像ジェネレーター</h1>
          <p className="text-sm text-gray-400 mt-1">
            エフェクターやギターの画像から背景をAIで透過し、自分のボードに表示する専用の画像を登録できます。
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
          <Sparkles className="w-4 h-4 text-cyan-400" aria-hidden />
          <span>ブラウザ上で背景透過（外部API不要）</span>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* アップロード＆プレビュー */}
        <div className="flex flex-col gap-4">
          <div
            {...getRootProps()}
            className={`group cursor-pointer rounded-xl border-2 border-dashed border-cyan-500/50 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors flex flex-col items-center justify-center px-4 py-6 text-center ${
              isDragActive ? "bg-cyan-500/15 border-cyan-400" : ""
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="w-8 h-8 text-cyan-400 mb-2" aria-hidden />
            <p className="text-sm font-medium text-gray-100">
              <span className="sm:hidden">タップして画像を選択</span>
              <span className="hidden sm:inline">ここに画像をドラッグ＆ドロップ またはクリックして選択</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">PNG / JPG / WEBP など（推奨: 正面または真上からの写真）</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 tracking-wider uppercase">透過結果プレビュー</p>
            <div className="w-full flex items-center justify-center">
              <div
                className="relative aspect-square max-w-md mx-auto w-full rounded-xl border border-white/10 overflow-hidden flex items-center justify-center"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg,#1f2933 25%,transparent 25%,transparent 75%,#1f2933 75%,#1f2933),linear-gradient(45deg,#1f2933 25%,transparent 25%,transparent 75%,#1f2933 75%,#1f2933)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0,8px 8px",
                }}
              >
                {isProcessing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                    <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-3" aria-hidden />
                    <p className="text-sm text-gray-200 font-medium">AIで背景を透過中...</p>
                    <p className="text-xs text-gray-400 mt-1">少し時間がかかります</p>
                  </div>
                )}
                {uploaded?.processedUrl ? (
                  <img
                    src={uploaded.processedUrl}
                    alt="Processed gear"
                    className="max-h-full max-w-full object-contain drop-shadow-2xl pointer-events-none select-none"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-500 gap-2">
                    <ImageIcon className="w-8 h-8" aria-hidden />
                    <p className="text-xs">ここに透過済み画像のプレビューが表示されます</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 機材画像を保存するボタンのみ */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {!initialGearId?.trim() && (
            <p className="text-sm text-gray-400">
              ボードの機材設定から「カスタム画像」で開くと、その機材の画像として保存できます。
            </p>
          )}
          {submitError && <p className="text-sm text-red-400">{submitError}</p>}
          <Button
            type="submit"
            disabled={isProcessing || isSubmitting || !processedImageBlob}
            className="w-full py-3 text-center font-bold rounded-md bg-transparent border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "保存中..." : "機材画像を保存する"}
          </Button>
        </form>
      </div>
    </>
  );
}

export function GearImageGenerator() {
  return (
    <div className="w-full min-h-[calc(100vh-64px)] px-4 pt-4 pb-4 flex flex-col gap-4">
      <GearImageGeneratorInner />
    </div>
  );
}

export const GearImageGeneratorContent = GearImageGeneratorInner;

