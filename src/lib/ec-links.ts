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
 * サウンドハウス 検索URL（サイト内検索と同様のパラメータで遷移）
 * 検索ボックス送信時に使われるパラメータに合わせています。
 */
export function getSoundHouseSearchUrl(gearName: string): string {
  const base = "https://www.soundhouse.co.jp/search/search_result.php";
  return `${base}?q=${encodeQuery(gearName)}`;
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
