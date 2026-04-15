"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { Button } from "./button";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * 確認ダイアログ。
 * confirm() の代替として使用する。
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "削除",
  cancelLabel = "キャンセル",
  destructive = true,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <RadixDialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <RadixDialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-surface-border bg-surface-card p-6 shadow-xl"
          aria-describedby="confirm-dialog-description"
        >
          <RadixDialog.Title className="text-base font-semibold text-white mb-2">
            {title}
          </RadixDialog.Title>
          <RadixDialog.Description
            id="confirm-dialog-description"
            className="text-sm text-gray-400 mb-5"
          >
            {description}
          </RadixDialog.Description>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              size="sm"
              className={
                destructive
                  ? "bg-red-600 hover:bg-red-700 text-white border-transparent"
                  : undefined
              }
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
