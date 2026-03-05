import Link from "next/link";
import type { SiteAnnouncement } from "@/lib/firebase/data";

const DISPLAY_LIMIT = 3;

/** 右サイドバー用：直近3件のみ表示。タイトルは詳細ページへのリンク。 */
export function SiteAnnouncements({
  announcements,
}: {
  announcements: SiteAnnouncement[];
}) {
  if (announcements.length === 0) return null;

  const items = announcements.slice(0, DISPLAY_LIMIT);

  return (
    <section
      className="relative overflow-hidden rounded-xl border border-surface-border/60 bg-gradient-to-b from-surface-card/90 to-surface-card/60 px-4 py-4 shadow-[0_0_24px_-4px_rgba(34,211,238,0.08)]"
      aria-label="Gear-Loomからのおしらせ"
    >
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-electric-blue/70 to-cyan-500/40" aria-hidden />
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-tight">
        <span className="bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
          Gear-Loomからのおしらせ
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-surface-border/80 to-transparent" aria-hidden />
      </h2>
      <ul className="space-y-3 text-xs">
        {items.map((a) => (
          <li key={a.id} className="group rounded-lg border border-transparent bg-surface-dark/30 px-2.5 py-2 transition-colors hover:border-electric-blue/20 hover:bg-electric-blue/5">
            <span className="text-gray-500 tabular-nums">{a.date}</span>
            {a.is_important && (
              <span className="ml-1.5 inline-block rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                重要
              </span>
            )}{" "}
            <Link
              href={`/announcements/${a.id}`}
              className="mt-0.5 block truncate text-white transition-colors group-hover:text-electric-blue"
            >
              {a.title}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 pt-2 border-t border-surface-border/50 text-[10px]">
        <Link
          href="/announcements"
          className="inline-flex items-center gap-1 text-electric-blue/90 underline decoration-electric-blue/50 underline-offset-2 transition-colors hover:text-electric-blue hover:drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]"
        >
          すべて見る
          <span className="text-electric-blue/70" aria-hidden>→</span>
        </Link>
      </p>
    </section>
  );
}
