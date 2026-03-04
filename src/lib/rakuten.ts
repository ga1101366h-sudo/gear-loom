/**
 * 楽天商品検索API（IchibaItem Search）の呼び出し
 * サーバーサイド専用（APIキーを隠すため）
 * - キーワード検索: 楽器・音響機器ジャンルで絞り込み（関係ない商品を防ぐ）
 * - ジャンル検索: カテゴリページ用のカタログ取得
 */

import { RAKUTEN_GENRE_INSTRUMENTS } from "@/data/rakuten-genres";
import type { RakutenItem, RakutenSearchResponse } from "@/types/rakuten";

// 新しい IchibaItem Search API (2022-06-01)
const RAKUTEN_API_BASE =
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601";
// 楽天に送る Origin / Referer（アプリ設定の許可ドメインと揃える）
const RAKUTEN_ORIGIN = "https://www.gear-loom.com";
const RAKUTEN_REFERER = "https://www.gear-loom.com/";
const MIN_KEYWORD_LENGTH = 1;
const MAX_HITS = 10;
const MAX_HITS_CATALOG = 20;
/** 同一キーワードでの連続呼び出しを避けるための簡易キャッシュ（メモリ） */
const cache = new Map<string, { at: number; items: RakutenItem[] }>();
const CACHE_TTL_MS = 60 * 1000; // 1分（Rate Limit 対策）

function getCached(key: string): RakutenItem[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.items;
}

function setCache(key: string, items: RakutenItem[]): void {
  cache.set(key, { at: Date.now(), items });
}

function buildBaseParams(): URLSearchParams {
  const appId = process.env.RAKUTEN_APPLICATION_ID;
  const params = new URLSearchParams({
    format: "json",
    applicationId: appId ?? "",
  });
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  if (accessKey) {
    // 新APIでは accessKey も必須。クエリに含める
    params.set("accessKey", accessKey);
  }
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
  if (affiliateId) params.set("affiliateId", affiliateId);
  return params;
}

function parseRakutenResponse(data: RakutenSearchResponse & { Items?: { Item: RakutenItem }[] }): RakutenItem[] {
  const rawItems: RakutenItem[] = [];
  if (Array.isArray(data.Items)) {
    for (const row of data.Items) {
      if (row?.Item) rawItems.push(normalizeLegacyItem(row.Item as unknown as Record<string, unknown>));
    }
  }
  if (rawItems.length === 0 && Array.isArray(data.items)) {
    rawItems.push(...data.items);
  }
  return rawItems;
}

/**
 * キーワードで楽天商品検索APIを実行（楽器・音響機器ジャンル固定）
 * applicationId 未設定時は空配列を返す
 */
export async function fetchRakutenItems(
  keyword: string,
  options?: { genreId?: number }
): Promise<RakutenItem[]> {
  const q = String(keyword).trim();
  if (q.length < MIN_KEYWORD_LENGTH) return [];

  const appId = process.env.RAKUTEN_APPLICATION_ID;
  if (!appId) return [];

  const genreId = options?.genreId ?? RAKUTEN_GENRE_INSTRUMENTS;
  const cacheKey = `kw:${q}:${MAX_HITS}:${genreId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const params = buildBaseParams();
  params.set("keyword", q);
  params.set("genreId", String(genreId));
  params.set("hits", String(MAX_HITS));
  params.set("page", "1");

  const url = `${RAKUTEN_API_BASE}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: {
        "User-Agent": "GearNexus/1.0",
        Origin: RAKUTEN_ORIGIN,
        Referer: RAKUTEN_REFERER,
      },
    });
    const data = (await res.json()) as RakutenSearchResponse & { Items?: { Item: RakutenItem }[] };

    if (!res.ok) {
      if (data.error === "too_many_requests") {
        console.warn("[rakuten] too_many_requests", { url, error: data.error_description });
        return [];
      }
      console.error("[rakuten] fetchRakutenItems error", {
        status: res.status,
        error: data.error,
        description: data.error_description,
      });
      return [];
    }

    const rawItems = parseRakutenResponse(data);
    setCache(cacheKey, rawItems);
    return rawItems;
  } catch (err) {
    console.error("[rakuten] fetchRakutenItems exception", err);
    return [];
  }
}

/**
 * ジャンルIDで楽天商品を取得（カテゴリページの機材カタログ用）
 */
export async function fetchRakutenItemsByGenreId(
  genreId: number,
  page = 1
): Promise<RakutenItem[]> {
  const appId = process.env.RAKUTEN_APPLICATION_ID;
  if (!appId) return [];

  const cacheKey = `genre:${genreId}:${page}:${MAX_HITS_CATALOG}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const params = buildBaseParams();
  params.set("genreId", String(genreId));
  params.set("hits", String(MAX_HITS_CATALOG));
  params.set("page", String(Math.max(1, page)));

  const url = `${RAKUTEN_API_BASE}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: {
        "User-Agent": "GearNexus/1.0",
        Origin: RAKUTEN_ORIGIN,
        Referer: RAKUTEN_REFERER,
      },
    });
    const data = (await res.json()) as RakutenSearchResponse & { Items?: { Item: RakutenItem }[] };

    if (!res.ok) {
      if (data.error === "too_many_requests") {
        console.warn("[rakuten] too_many_requests", { url, error: data.error_description });
        return [];
      }
      console.error("[rakuten] fetchRakutenItemsByGenreId error", {
        status: res.status,
        error: data.error,
        description: data.error_description,
      });
      return [];
    }

    const rawItems = parseRakutenResponse(data);
    setCache(cacheKey, rawItems);
    return rawItems;
  } catch (err) {
    console.error("[rakuten] fetchRakutenItemsByGenreId exception", err);
    return [];
  }
}

/** 旧APIの Item を RakutenItem に正規化 */
function normalizeLegacyItem(item: Record<string, unknown>): RakutenItem {
  const getStr = (k: string) => (item[k] != null ? String(item[k]) : "");
  const getNum = (k: string) => (item[k] != null ? Number(item[k]) : undefined);
  const getArr = (k: string): { imageUrl: string }[] => {
    const v = item[k];
    if (!Array.isArray(v)) return [];
    return v.map((x) =>
      typeof x === "object" && x && "ImageUrl" in x
        ? { imageUrl: String((x as { ImageUrl?: string }).ImageUrl ?? "") }
        : typeof x === "object" && x && "imageUrl" in x
          ? { imageUrl: String((x as { imageUrl?: string }).imageUrl ?? "") }
          : { imageUrl: "" }
    ).filter((x) => x.imageUrl);
  };
  return {
    itemName: getStr("itemName"),
    itemUrl: getStr("itemUrl"),
    affiliateUrl: getStr("affiliateUrl") || undefined,
    mediumImageUrls: getArr("mediumImageUrls"),
    smallImageUrls: getArr("smallImageUrls"),
    itemPrice: getNum("itemPrice"),
    shopName: getStr("shopName") || undefined,
    reviewCount: getNum("reviewCount"),
    itemCode: getStr("itemCode") || undefined,
  };
}
