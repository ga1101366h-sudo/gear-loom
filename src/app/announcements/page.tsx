import Link from "next/link";
import { getSiteAnnouncementsFromFirestore } from "@/lib/firebase/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "おしらせ一覧 | Gear-Loom",
  description: "Gear-Loomからのお知らせ一覧です。",
};

export default async function AnnouncementsListPage() {
  const announcements = await getSiteAnnouncementsFromFirestore(50);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="font-display text-2xl font-bold tracking-tight text-white">
        Gear-Loomからのおしらせ
      </h1>
      <p className="mt-2 text-sm text-gray-400">
        運営からのお知らせを掲載しています。
      </p>
      {announcements.length === 0 ? (
        <p className="mt-8 text-gray-500">現在、お知らせはありません。</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {announcements.map((a) => (
            <li key={a.id}>
              <Link
                href={`/announcements/${a.id}`}
                className="block rounded-lg border border-surface-border/80 bg-surface-card/80 p-4 transition-colors hover:border-electric-blue/40 hover:bg-surface-card"
              >
                <p className="text-xs text-gray-500">{a.date}</p>
                {a.is_important && (
                  <span className="ml-1 inline-block rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    重要
                  </span>
                )}
                <h2 className="mt-1 font-medium text-white line-clamp-2">
                  {a.title}
                </h2>
                {a.body && (
                  <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                    {a.body}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
