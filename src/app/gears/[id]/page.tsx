import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ECSearchLinks } from "@/components/ec-search-links";
import { getGearByIdFromFirestore, getGearRatingAggregateFromFirestore } from "@/lib/firebase/data";
import { JsonLd } from "@/components/seo/json-ld";

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%231a2332' width='400' height='400'/%3E%3Ctext fill='%236b7280' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='14'%3E機材画像%3C/text%3E%3C/svg%3E";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const gear = await getGearByIdFromFirestore(id);
  if (!gear) return { title: "機材が見つかりません" };
  return {
    title: `${gear.name} | 機材`,
    description: `${gear.name}の機材ページ。レビュー${gear.reviewCount}件。`,
  };
}

export default async function GearDetailPage({ params }: Props) {
  const { id } = await params;
  const gear = await getGearByIdFromFirestore(id);
  if (!gear) notFound();

  // gear_id で紐づく実レビューの評価を集計（rating>0 が1件以上ある場合のみ値が返る）
  const ratingAggregate = await getGearRatingAggregateFromFirestore(id);

  // --- 構造化データ（JSON-LD / schema.org Product）---
  // AggregateRating は gear_id で紐づく実レビュー（rating>0）を集計した本物の値のみ付与する。
  // 対象レビューが1件も無い場合は捏造せず aggregateRating を出さない。
  const gearJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: gear.name,
    url: `https://www.gear-loom.com/gears/${id}`,
    ...(gear.imageUrl ? { image: gear.imageUrl } : {}),
    ...(ratingAggregate
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: ratingAggregate.ratingValue,
            reviewCount: ratingAggregate.ratingCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <JsonLd data={gearJsonLd} />
      <Card className="overflow-hidden">
        <div className="relative aspect-video w-full bg-surface-card sm:aspect-square sm:max-h-[400px]">
          {gear.imageUrl ? (
            <Image
              src={gear.imageUrl}
              alt={gear.name}
              fill
              className="object-contain"
              sizes="(max-width:640px) 100vw, 400px"
              priority
              unoptimized
            />
          ) : (
            <div
              className="h-full w-full bg-surface-card"
              style={{ backgroundImage: `url(${PLACEHOLDER_IMG})`, backgroundSize: "cover" }}
            />
          )}
        </div>
        <CardHeader>
          <CardTitle className="text-xl text-white">{gear.name}</CardTitle>
          {/* JSON-LD の AggregateRating は「ページ上にも見えていること」が Google の要件。
              集計値がある場合は必ず★と件数を画面にも出す。 */}
          {ratingAggregate && (
            <CardDescription className="flex items-center gap-2">
              <span className="flex gap-0.5 text-electric-blue" aria-hidden>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className={i <= Math.round(ratingAggregate.ratingValue) ? "opacity-100" : "opacity-30"}>
                    ★
                  </span>
                ))}
              </span>
              <span>
                {ratingAggregate.ratingValue.toFixed(1)}（レビュー {ratingAggregate.ratingCount}件）
              </span>
            </CardDescription>
          )}
          {!ratingAggregate && gear.reviewCount > 0 && (
            <CardDescription>レビュー {gear.reviewCount}件</CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {gear.affiliateUrl && (
            <Button asChild>
              <a
                href={gear.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                購入ページへ（楽天・この商品を開く）
              </a>
            </Button>
          )}
          <div className="flex flex-wrap gap-4">
            <Link href="/gears" className="text-sm text-electric-blue hover:underline">
              ← 機材一覧
            </Link>
            <Link href="/gears/search" className="text-sm text-electric-blue hover:underline">
              機材検索
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4">
        <ECSearchLinks gearName={gear.name} />
      </div>
    </div>
  );
}
