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
import { getGearByIdFromFirestore } from "@/lib/firebase/data";

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

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
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
          {gear.reviewCount > 0 && (
            <CardDescription>レビュー {gear.reviewCount}件</CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {gear.affiliateUrl && (
            <Button asChild>
              <a
                href={gear.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                購入ページへ（楽天）
              </a>
            </Button>
          )}
          <Link href="/gears/search" className="text-sm text-electric-blue hover:underline">
            ← 機材検索に戻る
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
