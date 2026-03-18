/**
 * 機材名をクエリとして外部ECサイトの検索URLを生成する。
 */

function encodeQuery(q: string): string {
  return encodeURIComponent(q.trim());
}

const RAKUTEN_AFFILIATE_BASE =
  "https://hb.afl.rakuten.co.jp/hgc/518afa09.b7d684be.518afa0a.c16c0ffd/";

/**
 * Amazon 検索URL（アソシエイトIDを固定で付与）
 * https://www.amazon.co.jp/s?k={機材名}&tag=gearloom0f-22
 */
export function getAmazonSearchUrl(gearName: string): string {
  const base = "https://www.amazon.co.jp/s";
  const params = new URLSearchParams({
    k: gearName.trim(),
    tag: "gearloom0f-22",
  });
  return `${base}?${params.toString()}`;
}

/**
 * 楽天市場 検索URL（アフィリエイトリンクにラップ）
 * https://hb.afl.rakuten.co.jp/.../?pc={ENCODED(https://search.rakuten.co.jp/search/mall/{機材名}/)}
 */
export function getRakutenSearchUrl(gearName: string): string {
  const encodedKeyword = encodeQuery(gearName);
  const searchUrl = `https://search.rakuten.co.jp/search/mall/${encodedKeyword}/`;
  const encodedSearchUrl = encodeURIComponent(searchUrl);
  return `${RAKUTEN_AFFILIATE_BASE}?pc=${encodedSearchUrl}`;
}

/**
 * サウンドハウス 検索URL
 *
 * - ベースURL: https://www.soundhouse.co.jp/search/index
 * - クエリパラメータ: search_all
 * - キーワードサニタイズ:
 *   - 記号類（カッコやスラッシュ等）をスペースに置換（※ハイフンは残す）
 *   - 連続スペースを1つに圧縮
 *   - 先頭から2単語だけを使用（例: "BOSS BD-2 Blues Driver" -> "BOSS BD-2"）
 */
export function getSoundHouseSearchUrl(gearName: string): string {
  const base = "https://www.soundhouse.co.jp/search/index";

  // 記号をスペースに置換（ハイフンは残す）
  const replaced = gearName
    .replace(/[()［］【】〔〕｛｝{}“”"'/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = replaced.split(" ").filter(Boolean);
  const shortQuery = parts.slice(0, 2).join(" ") || replaced || gearName.trim();

  const params = new URLSearchParams({ search_all: shortQuery });
  return `${base}?${params.toString()}`;
}

/**
 * デジマート 検索URL（URLパラメータ）
 */
export function getDigimartSearchUrl(gearName: string): string {
  const base = "https://www.digimart.net/search";
  return `${base}?keywordAnd=${encodeQuery(gearName)}`;
}

export interface ECLinkItem {
  name: string;
  url: string;
}

/**
 * 機材名から全EC検索リンクを取得
 */
export function getECSearchLinks(gearName: string): ECLinkItem[] {
  if (!gearName?.trim()) return [];

  return [
    { name: "Amazon", url: getAmazonSearchUrl(gearName) },
    { name: "楽天市場", url: getRakutenSearchUrl(gearName) },
    { name: "デジマート", url: getDigimartSearchUrl(gearName) },
    { name: "サウンドハウス", url: getSoundHouseSearchUrl(gearName) },
  ];
}
