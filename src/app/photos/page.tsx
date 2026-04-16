import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { PhotoGallery } from "./photo-gallery";
import type { Review } from "@/types/database";

export const metadata: Metadata = {
  title: "フォト | Gear-Loom",
  description: "Gear-Loomに投稿された機材・楽器の画像ギャラリー。カテゴリ絞り込みやシャッフルで気になる機材を発見しよう。",
  robots: {
    index: true,
    follow: true,
  },
};

async function getAllReviewsWithImages(): Promise<Review[]> {
  try {
    const { getReviewsFromFirestore } = await import("@/lib/firebase/data");
    // 画像付き投稿を幅広く取得（上限200件）
    return await getReviewsFromFirestore(200);
  } catch {
    return [];
  }
}

export default async function PhotosPage() {
  const reviews = await getAllReviewsWithImages();

  return (
    <div className="space-y-6">
      <PhotoGallery reviews={reviews} />
      <Button variant="ghost" asChild>
        <Link href="/">トップに戻る</Link>
      </Button>
    </div>
  );
}
