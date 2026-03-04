/** 楽天商品検索API（IchibaItem Search 2022-06-01）のレスポンス型 */

export interface RakutenItemImage {
  imageUrl: string;
}

/** APIレスポンスの1商品（formatVersion=2 の平坦形式） */
export interface RakutenItem {
  itemName: string;
  itemUrl: string;
  /** アフィリエイトID指定時のみ返る */
  affiliateUrl?: string;
  mediumImageUrls?: RakutenItemImage[];
  smallImageUrls?: RakutenItemImage[];
  itemPrice?: number;
  shopName?: string;
  reviewCount?: number;
  itemCode?: string;
}

export interface RakutenSearchResponse {
  items?: RakutenItem[];
  count?: number;
  page?: number;
  first?: number;
  last?: number;
  hits?: number;
  carrier?: number;
  pageCount?: number;
  error?: string;
  error_description?: string;
}
