/**
 * 機材名をクエリとして外部ECサイトの検索URLを生成する。
 * アソシエイトIDは環境変数で設定可能。
 */

function encodeQuery(q: string): string {
  return encodeURIComponent(q.trim());
}

export interface ECLinkConfig {
  amazonTag?: string;
  rakutenTag?: string;
}

/**
 * Amazon 検索URL（アソシエイトID埋め込み可能）
 */
export function getAmazonSearchUrl(gearName: string, tag?: string): string {
  const base = "https://www.amazon.co.jp/s";
  const params = new URLSearchParams({ k: gearName });
  const affiliateTag = tag ?? process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG;
  if (affiliateTag) params.set("tag", affiliateTag);
  return `${base}?${params.toString()}`;
}

/**
 * 楽天市場 検索URL（アフィリエイトID埋め込み可能）
 */
export function getRakutenSearchUrl(gearName: string, tag?: string): string {
  const base = "https://search.rakuten.co.jp/search/mall";
  const q = encodeQuery(gearName);
  const affiliateTag = tag ?? process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_TAG;
  const path = affiliateTag ? `${q}/?af=${affiliateTag}` : `${q}/`;
  return `${base}/${path}`;
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
  return `${base}?keyword=${encodeQuery(gearName)}`;
}

export interface ECLinkItem {
  name: string;
  url: string;
}

/**
 * 機材名から全EC検索リンクを取得
 */
export function getECSearchLinks(gearName: string, config?: ECLinkConfig): ECLinkItem[] {
  if (!gearName?.trim()) return [];

  return [
    { name: "Amazon", url: getAmazonSearchUrl(gearName, config?.amazonTag) },
    { name: "楽天市場", url: getRakutenSearchUrl(gearName, config?.rakutenTag) },
    { name: "デジマート", url: getDigimartSearchUrl(gearName) },
    { name: "サウンドハウス", url: getSoundHouseSearchUrl(gearName) },
  ];
}
