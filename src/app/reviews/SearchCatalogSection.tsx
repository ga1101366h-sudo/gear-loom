"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setPendingGear } from "@/lib/pending-gear";

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%231a2332' width='200' height='200'/%3E%3Ctext fill='%236b7280' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='12'%3E機材%3C/text%3E%3C/svg%3E";

export type CatalogItem = {
  itemName: string;
  itemUrl: string;
  affiliateUrl?: string;
  imageUrl: string;
  itemPrice?: number;
  shopName?: string;
};

type Props = {
  keyword: string;
  catalogItems: CatalogItem[];
};

export function SearchCatalogSection({ keyword, catalogItems }: Props) {
  const router = useRouter();

  function handleOpenReview(item: CatalogItem) {
    setPendingGear({
      name: item.itemName,
      imageUrl: item.imageUrl || "",
      affiliateUrl: item.affiliateUrl || item.itemUrl,
    });
    router.push("/reviews/new?from=rakuten");
  }

  if (catalogItems.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-white">
        機材カタログ / レビューを書いてみませんか？
      </h2>
      <p className="mb-3 text-sm text-gray-400">
        「{keyword}」に関連する機材の候補です。気になる機材でレビューを投稿すると、機材がサイトに登録されます。
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {catalogItems.map((item) => (
          <li key={item.itemName + item.itemUrl}>
            <Card className="h-full overflow-hidden transition-all">
              <div className="relative aspect-square w-full bg-surface-card">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.itemName}
                    fill
                    className="object-cover"
                    sizes="(max-width:640px) 50vw, 25vw"
                    unoptimized
                  />
                ) : (
                  <div
                    className="h-full w-full bg-surface-card"
                    style={{
                      backgroundImage: `url(${PLACEHOLDER_IMG})`,
                      backgroundSize: "cover",
                    }}
                  />
                )}
              </div>
              <CardHeader className="p-3">
                <CardTitle className="line-clamp-2 text-base text-white">
                  {item.itemName}
                </CardTitle>
                {(item.itemPrice != null || item.shopName) && (
                  <CardDescription className="text-xs text-gray-400">
                    {item.itemPrice != null && `￥${item.itemPrice.toLocaleString()}`}
                    {item.shopName && (item.itemPrice != null ? ` ・ ${item.shopName}` : item.shopName)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <Button size="sm" className="w-full" onClick={() => handleOpenReview(item)}>
                  この機材でレビューを書く
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

