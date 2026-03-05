export function buildReviewShareText(opts: {
  title?: string | null;
  makerName?: string | null;
  gearName?: string | null;
  categoryNameJa?: string | null;
}): string {
  const rawTitle = (opts.title ?? "").trim() || "Gear-Loomレビュー";
  const maker = (opts.makerName ?? "").trim();
  const gear = (opts.gearName ?? "").trim();
  const category = (opts.categoryNameJa ?? "").trim();

  const labelParts: string[] = [];
  if (maker) labelParts.push(maker);
  if (gear) labelParts.push(gear);

  let label = "";
  if (maker && gear) {
    label = `${maker}/${gear}`;
  } else if (labelParts.length > 0) {
    label = labelParts.join(" ");
  }

  const suffixLine = label ? `${label} のレビュー` : "のレビュー";

  const sanitizeForTag = (name: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const cleaned = trimmed.replace(/[\s\u3000・＆&/／\-]/g, "");
    return cleaned || null;
  };

  const tags: string[] = ["#GearLoom"];
  const makerTag = maker ? sanitizeForTag(maker) : null;
  if (makerTag) tags.push(`#${makerTag}`);
  const categoryTag = category ? sanitizeForTag(category) : null;
  if (categoryTag) tags.push(`#${categoryTag}`);

  const hashtagBlock = tags.join("\n");

  const MAX_LEN = 120;
  let titleForTweet = rawTitle;
  let tweet = `${titleForTweet}\n${suffixLine}\n${hashtagBlock}`;

  if (tweet.length > MAX_LEN) {
    const reservedBlock = `\n${suffixLine}\n${hashtagBlock}`;
    const reservedLen = reservedBlock.length;
    const maxTitleLen = Math.max(10, MAX_LEN - reservedLen - 3);
    if (titleForTweet.length > maxTitleLen) {
      titleForTweet = `${titleForTweet.slice(0, maxTitleLen)}...`;
      tweet = `${titleForTweet}\n${suffixLine}\n${hashtagBlock}`;
    }
  }

  return tweet;
}
