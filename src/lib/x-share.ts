import { getCategoryHashtagLabel } from "@/data/post-categories";

export function buildReviewShareText(opts: {
  title?: string | null;
  makerName?: string | null;
  gearName?: string | null;
  categoryNameJa?: string | null;
  categorySlug?: string | null;
  /** true の場合は投稿者本人としてのシェア文、false/未指定は第三者視点のシェア文を生成する */
  sharedByOwner?: boolean | null;
}): string {
  const rawTitle = (opts.title ?? "").trim() || "Gear-Loomレビュー";
  const maker = (opts.makerName ?? "").trim();
  const gear = (opts.gearName ?? "").trim();
  const hasMakerAndGear = !!maker && !!gear;

  const sanitizeForTag = (name: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const cleaned = trimmed.replace(/[\s\u3000・＆&/／\-]/g, "");
    return cleaned || null;
  };

  const tags: string[] = ["#GearLoom"];
  if (hasMakerAndGear) {
    const makerTag = maker ? sanitizeForTag(maker) : null;
    if (makerTag) tags.push(`#${makerTag}`);
  }
  const categoryLabelForTag =
    opts.categorySlug && opts.categorySlug.trim()
      ? getCategoryHashtagLabel(opts.categorySlug.trim())
      : (opts.categoryNameJa ?? "").trim();
  const categoryTag = categoryLabelForTag ? sanitizeForTag(categoryLabelForTag) : null;
  if (categoryTag) tags.push(`#${categoryTag}`);

  const hashtagBlock = tags.join("\n");

  const MAX_LEN = 120;

  // 投稿者本人かどうかでヘッダー文言を分岐
  let header: string;
  if (opts.sharedByOwner) {
    header = hasMakerAndGear
      ? `${maker} ${gear} のレビューを投稿しました！`
      : rawTitle;
  } else {
    // 第三者・未ログイン時はシンプルにタイトル＋サイト名
    header = `${rawTitle} | Gear-Loom`;
  }

  let tweet: string;

  tweet = `${header}\n${hashtagBlock}`;
  if (tweet.length > MAX_LEN) {
    const reservedBlock = `\n${hashtagBlock}`;
    const reservedLen = reservedBlock.length;
    const maxHeaderLen = Math.max(10, MAX_LEN - reservedLen - 3);
    if (header.length > maxHeaderLen) {
      header = `${header.slice(0, maxHeaderLen)}...`;
      tweet = `${header}\n${hashtagBlock}`;
    }
  }

  return tweet;
}
