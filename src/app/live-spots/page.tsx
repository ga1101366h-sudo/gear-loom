import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TopPageLiveCalendar } from "@/components/top-page-live-calendar";
import { NearbySpotsMap } from "@/components/nearby-spots-map";
import { getLiveEventsFromFirestore } from "@/lib/firebase/data";
import type { LiveEvent } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ライブ日程・周辺スポット | Gear-Loom",
  description:
    "みんなのライブ日程カレンダーと、近くの楽器屋・ライブハウスをGoogleマップで検索。",
};

export default async function LiveSpotsPage() {
  let liveEvents: LiveEvent[] = [];
  try {
    liveEvents = await getLiveEventsFromFirestore();
  } catch {
    // カレンダーは空で表示
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-white mb-2">
        ライブ日程・周辺スポット
      </h1>
      <p className="text-sm text-gray-400 mb-8">
        ライブ予定の確認と、近くの楽器屋・ライブハウス検索ができます。
      </p>

      {/* みんなのライブ日程 */}
      <section className="mb-12">
        <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-white">
          みんなのライブ日程
        </h2>
        <p className="mb-6 text-sm text-gray-400">
          日付をクリックするとその日のライブ予定が表示されます。マイページで自分の予定を追加・編集できます。
        </p>
        <Card className="card-hover">
          <CardContent className="py-6">
            <TopPageLiveCalendar events={liveEvents} />
          </CardContent>
        </Card>
      </section>

      {/* 近くのお店・ライブハウスを探す */}
      <section>
        <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-white">
          近くのお店・ライブハウスを探す
        </h2>
        <p className="mb-4 text-sm text-gray-400">
          ボタンで切り替えて、Googleマップで楽器屋さん・ライブハウスを検索できます。
        </p>
        <NearbySpotsMap />
      </section>

      <div className="mt-8">
        <Button variant="outline" asChild>
          <Link href="/">トップに戻る</Link>
        </Button>
      </div>
    </div>
  );
}
