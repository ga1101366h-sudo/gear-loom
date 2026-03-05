export function buildReviewShareText(opts: {
  title?: string | null;
  makerName?: string | null;
  gearName?: string | null;
  categoryNameJa?: string | null;
  categorySlug?: string | null;
}): string {
  const rawTitle = (opts.title ?? "").trim() || "Gear-Loomレビュー";
  const maker = (opts.makerName ?? "").trim();
  const gear = (opts.gearName ?? "").trim();
  const category = (opts.categoryNameJa ?? "").trim();
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
  const categoryTag = category ? sanitizeForTag(category) : null;
  if (categoryTag) tags.push(`#${categoryTag}`);

  const hashtagBlock = tags.join("\n");

  const MAX_LEN = 120;
  let header = hasMakerAndGear
    ? `${maker} ${gear} のレビューを投稿しました！🎸`
    : rawTitle;
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
