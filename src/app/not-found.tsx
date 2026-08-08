import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VISIBLE_MAIN_CATEGORIES } from "@/data/visible-menu";

/**
 * 404ページ（App Router のルート not-found）。
 *
 * ★なぜ作ったか（2026-08-08 第2弾A）
 *   これが無いと Next.js の初期設定の 404（白背景・英語「404 This page could not be found.」）が出る。
 *   サイトはダークテーマなので、白背景のせいでヘッダーがグレー地にグレー文字になって読めず、
 *   サイトへ戻る導線も一切無かった（本番のスクリーンショットで確認）。
 *   出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_本番_視覚チェック.md 🔴-2
 *   加えて第1弾で「中身の無いカテゴリURLを意図的に404にする」変更を入れたため、
 *   ユーザーがこの画面に到達する確率が上がっている。着地先を整えるのはセットで必要。
 *
 * ★HTTPステータスについて（2026-08-09 第3弾Aで更新）
 *   このファイルは**見た目だけ**を担当する。ステータス404は各ページの `notFound()` と、
 *   ルーティング不一致時の Next.js 本体が返す。
 *   以前は「ルート直下の `src/app/loading.tsx` が Suspense 境界を作るせいで notFound() が
 *   ステータスに反映されず 200 のままになる」問題があり、src/middleware.ts で肩代わりしていたが、
 *   第3弾Aで loading.tsx を削除して根本解消した（middleware の404回避策も撤去済み）。
 *   出典：C:\AI組織運営\.company\engineering\notes\2026-08-09_GearLoom_SEO修正_第3弾A実装.md
 */
export const metadata = {
  title: "ページが見つかりません",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 py-12 text-center sm:py-20">
      <div className="space-y-3">
        <p className="font-display text-6xl font-bold tracking-tight text-electric-blue drop-shadow-[0_0_20px_rgba(0,212,255,0.45)] sm:text-7xl">
          404
        </p>
        <h1 className="text-xl font-bold text-white sm:text-2xl">
          お探しのページは見つかりませんでした
        </h1>
        <p className="text-sm leading-relaxed text-gray-400">
          URLが変わったか、削除された可能性があります。
          <br className="hidden sm:block" />
          下のリンクから、お探しの内容にたどり着けるかもしれません。
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href="/">トップへ戻る</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/reviews">レビュー一覧を見る</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/boards">エフェクターボードを見る</Link>
        </Button>
      </div>

      <Card className="w-full">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-white">カテゴリから探す</h2>
          <ul className="flex flex-wrap justify-center gap-2">
            {VISIBLE_MAIN_CATEGORIES.map((name) => (
              <li key={name}>
                <Link
                  href={`/category/${encodeURIComponent(name)}`}
                  className="inline-flex rounded-md border border-surface-border bg-surface-card px-3 py-1.5 text-xs text-gray-200 transition-colors hover:border-electric-blue/60 hover:text-electric-blue"
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
