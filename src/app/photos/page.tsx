import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { CategoryListSection } from "@/app/reviews/category-list-section";
import type { Review } from "@/types/database";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

async function getPhotoReviews(): Promise<Review[]> {
  try {
    const { getReviewsFromFirestore } = await import("@/lib/firebase/data");
    return await getReviewsFromFirestore(undefined, "photo");
  } catch {
    return [];
  }
}

export default async function PhotosPage() {
  const reviews = await getPhotoReviews();

  return (
    <div className="space-y-6">
      <CategoryListSection
        title="フォト"
        reviews={reviews}
        emptyMessage="フォト記事はまだありません。"
      />
      <Button variant="ghost" asChild>
        <Link href="/">トップに戻る</Link>
      </Button>
    </div>
  );
}
