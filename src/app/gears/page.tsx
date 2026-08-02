import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getGearsFromFirestore } from "@/lib/firebase/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "機材一覧",
  description:
    "Gear-Loom に登録されている機材の一覧です。気になる機材のページから、レビューや購入先を探せます。",
};

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%231a2332' width='200' height='200'/%3E%3Ctext fill='%236b7280' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='12'%3E機材%3C/text%3E%3C/svg%3E";

export default async function GearIndexPage() {
  const gears = await getGearsFromFirestore();

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-2 text-2xl font-bold text-white">機材一覧</h1>
      <p className="mb-6 text-sm text-gray-400">
        レビューが投稿された機材のページ一覧です。機材名で探す場合は
        <Link href="/gears/search" className="mx-1 text-electric-blue hover:underline">
          機材検索
        </Link>
        をご利用ください。
      </p>

      {gears.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center text-gray-400">
            <p>まだ機材ページがありません。レビューを投稿すると、その機材のページが作られます。</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/gears/search">機材を検索する</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/reviews">みんなのレビューを見る</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {gears.map((g) => (
            <li key={g.id}>
              <Card className="h-full overflow-hidden transition-all hover:border-electric-blue/50">
                <Link href={`/gears/${g.id}`} className="block">
                  <div className="relative aspect-square w-full bg-surface-card">
                    {g.imageUrl ? (
                      <Image
                        src={g.imageUrl}
                        alt={g.name}
                        fill
                        className="object-cover"
                        sizes="(max-width:640px) 100vw, 25vw"
                        unoptimized
                      />
                    ) : (
                      <div
                        className="h-full w-full bg-surface-card"
                        style={{ backgroundImage: `url(${PLACEHOLDER_IMG})`, backgroundSize: "cover" }}
                      />
                    )}
                  </div>
                  <CardHeader className="p-3">
                    <CardTitle className="line-clamp-2 text-base text-white">{g.name}</CardTitle>
                    {g.reviewCount > 0 && (
                      <CardDescription className="text-xs text-gray-400">
                        レビュー {g.reviewCount}件
                      </CardDescription>
                    )}
                  </CardHeader>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
