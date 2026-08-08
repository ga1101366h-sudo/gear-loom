import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-electric-blue text-surface-dark hover:bg-electric-blue-dim border border-cyan-500/80 shadow-[0_0_8px_rgba(6,182,212,0.4)] hover:shadow-[0_0_12px_rgba(6,182,212,0.6)]",
        secondary:
          "bg-surface-card border border-surface-border text-gray-200 hover:bg-surface-border/50 shadow-[0_0_6px_rgba(6,182,212,0.2)] hover:shadow-[0_0_8px_rgba(6,182,212,0.35)]",
        outline:
          "border border-cyan-500 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)] hover:bg-cyan-500/10 hover:shadow-[0_0_12px_rgba(6,182,212,0.55)]",
        ghost: "text-gray-200 hover:bg-surface-card hover:text-white",
        link: "text-electric-blue underline-offset-4 hover:underline",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 border border-red-500",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/**
 * 幅の狭いカード内で全幅表示するボタンに足すクラス。
 *
 * ★なぜ必要か（2026-08-08 第2弾A・実測）
 *   buttonVariants の基底に `whitespace-nowrap` があるため、ボタン幅より文字が長いと
 *   **折り返さずにボタンの外へ文字がはみ出す**（PC 1920px のカタログカードで実測：
 *   ボタン幅 157px に対し文字が必要とする幅 162px。全カテゴリの全カードで発生）。
 *   出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_本番_視覚チェック.md 🔴-1
 *   ここで折り返しを許可し高さを可変にすることで、**カード幅がいくつでもはみ出さない**。
 *
 * ★「文字を小さくする」「文字を短くする」だけでは直らない理由（実測）
 *   同じカードのボタン幅は、画面幅によって **1920px:155px / 1024px:115px / 768px:89px** と変わる。
 *   一方 "この機材でレビューを書く" は 1行だと 12px フォントでも 144px 必要。
 *   **どのフォントサイズでも 768〜1024px では1行に収まらない**ので、折り返しの許可が必須。
 *   そのうえで px-1（左右4px）にして、PC幅（155px枠 − 8px ＝ 147px ≥ 144px）では1行に収める。
 *   折り返す場合も text-balance で行を均等に割り、1文字だけが次行に落ちるのを避ける。
 */
export const CARD_ACTION_BUTTON_CLASS =
  "w-full whitespace-normal text-balance h-auto min-h-[2.25rem] px-1 py-1.5 text-xs leading-snug";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
