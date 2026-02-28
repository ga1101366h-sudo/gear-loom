import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CategoryListSection } from "@/app/reviews/category-list-section";
import type { Review } from "@/types/database";

async function getBlogReviews(): Promise<Review[]> {
  try {
    const { getReviewsFromFirestore } = await import("@/lib/firebase/data");
    return await getReviewsFromFirestore(undefined, "blog");
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const reviews = await getBlogReviews();

  return (
    <div className="space-y-6">
      <CategoryListSection
        title="ブログ"
        reviews={reviews}
        emptyMessage="ブログ記事はまだありません。"
      />
      <Button variant="ghost" asChild>
        <Link href="/">トップに戻る</Link>
      </Button>
    </div>
  );
}
