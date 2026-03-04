import { Suspense } from "react";
import { GearSearchClient } from "./GearSearchClient";

export const metadata = {
  title: "機材検索",
  description: "機材名で検索し、登録済み機材や楽天の商品からページを作成できます。",
};

function SearchFallback() {
  return (
    <div className="space-y-6">
      <div className="h-10 animate-pulse rounded-lg bg-surface-card" />
      <div className="h-32 animate-pulse rounded-lg bg-surface-card" />
    </div>
  );
}

export default function GearSearchPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-white">機材検索</h1>
      <Suspense fallback={<SearchFallback />}>
        <GearSearchClient />
      </Suspense>
    </div>
  );
}
