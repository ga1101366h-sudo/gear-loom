"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const BUTTON_CLASS =
  "min-w-[260px] rounded-lg border border-cyan-400/80 bg-transparent px-8 py-3 text-base font-medium text-cyan-300 shadow-none hover:bg-cyan-500/10 hover:text-cyan-200 transition-colors";

export function AboutCtaSection() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <section
        className="bg-gray-900 px-4 py-20 sm:py-24 md:py-28"
        aria-label="はじめる"
      >
        <div className="mx-auto max-w-2xl text-center">
          <div className="h-8 w-64 mx-auto animate-pulse rounded bg-gray-700/60" />
          <div className="mt-4 h-5 w-80 mx-auto animate-pulse rounded bg-gray-700/50" />
          <div className="mt-10 h-12 w-[260px] mx-auto animate-pulse rounded-lg bg-gray-700/50" />
          <div className="mt-8 h-4 w-24 mx-auto animate-pulse rounded bg-gray-700/40" />
        </div>
      </section>
    );
  }

  if (user) {
    return (
      <section
        className="bg-gray-900 px-4 py-20 sm:py-24 md:py-28"
        aria-label="はじめる"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            あなたの愛機を語ろう
          </p>
          <p className="mt-4 text-sm text-gray-400 sm:text-base">
            機材のレビューやカスタム手帳への記録で、あなたの音楽ライフを残しませんか？
          </p>
          <div className="mt-10">
            <Button asChild size="lg" className={BUTTON_CLASS}>
              <Link href="/reviews/new">レビューを投稿する</Link>
            </Button>
          </div>
          <p className="mt-8">
            <Link
              href="/"
              className="text-sm text-gray-500 underline decoration-gray-600 underline-offset-2 hover:text-gray-300"
            >
              トップページへ
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="bg-gray-900 px-4 py-20 sm:py-24 md:py-28"
      aria-label="はじめる"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          さあ、あなたの愛機を登録しよう
        </p>
        <p className="mt-4 text-sm text-gray-400 sm:text-base">
          会員登録は無料。GoogleやX（Twitter）アカウントでもすぐに始められます。
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className={BUTTON_CLASS}>
            <Link href="/signup">無料会員登録</Link>
          </Button>
        </div>
        <p className="mt-8">
          <Link
            href="/"
            className="text-sm text-gray-500 underline decoration-gray-600 underline-offset-2 hover:text-gray-300"
          >
            トップページへ
          </Link>
        </p>
      </div>
    </section>
  );
}
