import Link from "next/link";
import { POST_CATEGORY_GROUPS } from "@/data/post-categories";

function getCategoryHref(slug: string): string {
  switch (slug) {
    case "custom":
      return "/notebook";
    case "blog":
      return "/blog";
    case "photo":
      return "/photos";
    case "event":
      return "/events";
    default:
      return `/reviews?category=${encodeURIComponent(slug)}`;
  }
}

const ALL_CATEGORY_ITEMS = POST_CATEGORY_GROUPS.flatMap((g) => g.items);

/** スマホ用：横スクロールのカテゴリチップ */
export function TopPageCategoryNavMobile() {
  return (
    <nav
      className="md:hidden w-full overflow-x-auto scrollbar-hide -mx-3 px-3 py-2"
      aria-label="カテゴリ"
    >
      <div className="flex gap-2 shrink-0 w-max">
        {ALL_CATEGORY_ITEMS.map((i) => (
          <Link
            key={i.slug}
            href={getCategoryHref(i.slug)}
            className="shrink-0 rounded-full border border-surface-border bg-surface-card/80 px-3 py-1.5 text-xs text-gray-300 hover:text-electric-blue hover:border-electric-blue/50 hover:bg-electric-blue/5 transition-colors whitespace-nowrap"
          >
            {i.name_ja}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function TopPageCategoryNav() {
  return (
    <nav
      className="hidden md:block w-52 shrink-0 space-y-1 rounded-lg border border-surface-border bg-surface-card/80 py-3 px-3"
      aria-label="カテゴリ"
    >
      <p className="px-2 pb-2 text-xs font-medium text-gray-500 border-b border-surface-border/50 mb-2">
        カテゴリ
      </p>
      {POST_CATEGORY_GROUPS.map((g) => (
        <div key={g.groupLabel || g.items[0]?.slug} className="space-y-0.5">
          {g.groupLabel && (
            <p className="px-2 pt-2 first:pt-0 text-xs font-medium text-gray-500">
              {g.groupLabel}
            </p>
          )}
          <ul className="space-y-0.5">
            {g.items.map((i) => (
              <li key={i.slug}>
                <Link
                  href={getCategoryHref(i.slug)}
                  className="block px-2 py-1.5 text-sm text-gray-300 hover:text-electric-blue hover:bg-electric-blue/5 rounded transition-colors"
                >
                  {i.name_ja}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
