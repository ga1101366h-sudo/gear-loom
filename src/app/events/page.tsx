import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CategoryListSection } from "@/app/reviews/category-list-section";
import type { Review } from "@/types/database";

// 正規URLの明示（2026-08-03。Search Console の重複判定対策）
export const metadata = {
  alternates: { canonical: "/events" },
};

async function getEventReviews(): Promise<Review[]> {
  try {
    const { getReviewsFromFirestore } = await import("@/lib/firebase/data");
    return await getReviewsFromFirestore(undefined, "event");
  } catch {
    return [];
  }
}

export default async function EventsPage() {
  const reviews = await getEventReviews();

  return (
    <div className="space-y-6">
      <CategoryListSection
        title="イベント"
        reviews={reviews}
        emptyMessage="イベント記事はまだありません。"
      />
      <Button variant="ghost" asChild>
        <Link href="/">トップに戻る</Link>
      </Button>
    </div>
  );
}
