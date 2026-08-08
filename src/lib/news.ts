export type ExternalNewsItem = {
  id: string;
  title: string;
  url: string;
  source: "digimart" | "guitarmag" | "prtimes";
  sourceLabel: string;
  publishedAt?: string;
};

const GUITAR_MAG_FEED_URL =
  "https://guitarmagazine.jp/category/gear/new_gear/feed/";
const DIGIMART_URL = "https://www.digimart.net/magazine/";
const PRTIMES_GAKKI_URL =
  "https://prtimes.jp/topics/keywords/%E6%A5%BD%E5%99%A8";

/**
 * 外部フィード／外部HTMLから取り出したテキストの HTML エンティティを実際の文字に戻す。
 *
 * ★なぜ必要か（2026-08-08 第2弾A・実測）
 *   トップページの「楽器・機材ニュース」に
 *   `Caramel&#8217;s Guitar Kitchen…` のように **`&#8217;` が記号の羅列のまま**表示されていた。
 *   出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_本番_視覚チェック.md 🔴-3
 *   原因は、RSS の <title> が CDATA ではない場合に本文がエンティティで符号化されており
 *   （実測：https://guitarmagazine.jp/category/gear/new_gear/feed/ の title にそのまま入っている）、
 *   取り込み側で一度も復号していなかったこと。
 *   React はテキストを自動エスケープして描画するので、ここで実文字に戻すのが正しい
 *   （逆に戻さないと、記号の羅列がそのまま読者に見える）。
 */
export function decodeHtmlEntities(input: string): string {
  const NAMED: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: "\u00A0",
  };
  return input.replace(
    /&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (whole, body: string) => {
      if (body.startsWith("#")) {
        const isHex = body[1] === "x" || body[1] === "X";
        const code = Number.parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
        if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return whole;
        try {
          return String.fromCodePoint(code);
        } catch {
          return whole;
        }
      }
      // 未知の名前付きエンティティは元のまま残す（勝手に文字を捨てない）
      return NAMED[body.toLowerCase()] ?? whole;
    }
  );
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 * 30 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseRssItems(
  xml: string,
  source: ExternalNewsItem["source"],
  sourceLabel: string,
  limit: number
): ExternalNewsItem[] {
  const items: ExternalNewsItem[] = [];
  const itemRegex = /<item[\s\S]*?<\/item>/g;
  const matches = xml.match(itemRegex) ?? [];
  for (const chunk of matches) {
    const titleMatch =
      chunk.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ??
      chunk.match(/<title>([^<]+)<\/title>/);
    const linkMatch = chunk.match(/<link>([^<]+)<\/link>/);
    const dateMatch = chunk.match(/<pubDate>([^<]+)<\/pubDate>/);
    const title = titleMatch?.[1] ? decodeHtmlEntities(titleMatch[1]).trim() : undefined;
    const url = linkMatch?.[1]?.trim();
    if (!title || !url) continue;
    items.push({
      id: url,
      title,
      url,
      source,
      sourceLabel,
      publishedAt: dateMatch?.[1]?.trim(),
    });
    if (items.length >= limit) break;
  }
  return items;
}

function parseDigimartHtml(html: string, limit: number): ExternalNewsItem[] {
  const items: ExternalNewsItem[] = [];
  const linkRegex =
    /<a[^>]+href="(https?:\/\/www\.digimart\.net\/magazine\/article\/[^"]+)"[^>]*>(.*?)<\/a>/gi;
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    const rawTitle = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, "")).trim();
    if (!rawTitle) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    items.push({
      id: url,
      title: rawTitle,
      url,
      source: "digimart",
      sourceLabel: "デジマート・マガジン",
    });
    if (items.length >= limit) break;
  }
  return items;
}

function parsePrTimesHtml(html: string, limit: number): ExternalNewsItem[] {
  const items: ExternalNewsItem[] = [];
  const linkRegex =
    /<a[^>]+href="(https?:\/\/prtimes\.jp\/main\/html\/searchrlp\/company_id\/[^"]+)"[^>]*>(.*?)<\/a>/gi;
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    const rawTitle = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, "")).trim();
    if (!rawTitle) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    items.push({
      id: url,
      title: rawTitle,
      url,
      source: "prtimes",
      sourceLabel: "PR TIMES（楽器）",
    });
    if (items.length >= limit) break;
  }
  return items;
}

export async function getExternalNewsForTopPage(): Promise<{
  digimart: ExternalNewsItem[];
  guitarmag: ExternalNewsItem[];
  prtimes: ExternalNewsItem[];
}> {
  const [rssXml, digimartHtml, prtimesHtml] = await Promise.all([
    fetchText(GUITAR_MAG_FEED_URL),
    fetchText(DIGIMART_URL),
    fetchText(PRTIMES_GAKKI_URL),
  ]);

  const guitarmag = rssXml
    ? parseRssItems(rssXml, "guitarmag", "ギター・マガジンWEB（New Gear）", 5)
    : [];
  let digimart = digimartHtml ? parseDigimartHtml(digimartHtml, 5) : [];
  let prtimes = prtimesHtml ? parsePrTimesHtml(prtimesHtml, 5) : [];

  // フォールバック：記事が取れない場合は一覧ページへのリンクだけでも出す
  if (digimart.length === 0) {
    digimart = [
      {
        id: DIGIMART_URL,
        title: "デジマート・マガジンの最新記事一覧を見る",
        url: DIGIMART_URL,
        source: "digimart",
        sourceLabel: "デジマート・マガジン",
      },
    ];
  }
  if (prtimes.length === 0) {
    prtimes = [
      {
        id: PRTIMES_GAKKI_URL,
        title: "PR TIMES「楽器」カテゴリの最新リリース一覧を見る",
        url: PRTIMES_GAKKI_URL,
        source: "prtimes",
        sourceLabel: "PR TIMES（楽器）",
      },
    ];
  }

  return { digimart, guitarmag, prtimes };
}

