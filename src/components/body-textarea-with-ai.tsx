"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  /** 本文の最大文字数（機材レビュー用。指定時は textarea に maxLength を付与） */
  maxLength?: number;
  /** HTML5 required（必須項目） */
  required?: boolean;
};

export function BodyTextareaWithAi({
  id,
  value,
  onChange,
  placeholder = "使い心地や音の特徴などを書いてください",
  rows = 8,
  disabled = false,
  maxLength,
  required = false,
}: Props) {
  const [aiLoading, setAiLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suggested, setSuggested] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleAiImprove() {
    if (!value.trim()) {
      setAiError("本文を入力してからボタンを押してください。");
      return;
    }
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/improve-body", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const raw = await res.text();
      let data: { error?: string; suggested?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: "レスポンスの解析に失敗しました。" };
      }
      if (!res.ok) {
        setAiError((data.error as string) || "AI補正に失敗しました。");
        return;
      }
      setSuggested(typeof data.suggested === "string" ? data.suggested : "");
      setDialogOpen(true);
    } catch (err) {
      console.error("[BodyTextareaWithAi]", err);
      setAiError("通信エラーが発生しました。しばらくしてからお試しください。");
    } finally {
      setAiLoading(false);
    }
  }

  function handleApply() {
    if (suggested) {
      onChange(suggested);
    }
    setDialogOpen(false);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>本文</Label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          onChange(maxLength != null && next.length > maxLength ? next.slice(0, maxLength) : next);
        }}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        maxLength={maxLength}
        required={required}
        className="flex w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-electric-blue"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || aiLoading}
          onClick={handleAiImprove}
          className="min-h-[44px] touch-manipulation"
          aria-label={aiLoading ? "補正案を生成中" : "AIで補正案を表示"}
        >
          {aiLoading ? "補正案を生成中..." : "AIで補正案を表示"}
        </Button>
        {aiError && (
          <span className="text-sm text-red-400">{aiError}</span>
        )}
      </div>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg max-h-[85dvh] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-surface-border bg-surface-dark p-4 sm:p-6 shadow-xl flex flex-col"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Dialog.Title className="text-lg font-semibold text-white mb-2 shrink-0">
              AI補正案
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              記述内容を元にAIが補正した案です。そのまま本文に反映するか、編集してから使えます。
            </Dialog.Description>
            <div className="min-h-0 flex-1 overflow-y-auto mb-4">
              <textarea
                readOnly
                value={suggested}
                rows={10}
                className="flex w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100 focus:outline-none min-h-0"
              />
            </div>
            <div className="flex justify-end gap-2 shrink-0">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" className="min-h-[44px] touch-manipulation">
                  閉じる
                </Button>
              </Dialog.Close>
              <Button
                type="button"
                onClick={handleApply}
                className="min-h-[44px] touch-manipulation"
              >
                本文に反映
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
