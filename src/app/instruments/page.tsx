import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function InstrumentsPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-white mb-4">楽器別情報</h1>
      <p className="text-gray-400 mb-6">
        メーカーや楽器タイプで検索できる機能を準備しています。
      </p>
      <Card>
        <CardContent className="py-12 text-center text-gray-400">
          準備中です。しばらくお待ちください。
        </CardContent>
      </Card>
      <div className="mt-6">
        <Button variant="ghost" asChild>
          <Link href="/">トップに戻る</Link>
        </Button>
      </div>
    </div>
  );
}
