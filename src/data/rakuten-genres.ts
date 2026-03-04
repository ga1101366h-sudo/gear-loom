/**
 * 楽天API ジャンルIDマッピング
 * キーワード検索時は「楽器・音響機器」で絞り込み、関係ない商品ヒットを防ぐ
 */

/** 楽器・音響機器（大ジャンル）。キーワード検索時に必ず指定する */
export const RAKUTEN_GENRE_INSTRUMENTS = 112493;

/**
 * サイトのカテゴリスラッグ → 楽天ジャンルID
 * 未定義のスラッグは RAKUTEN_GENRE_INSTRUMENTS で検索する
 * 必要に応じて楽天ジャンル検索APIでサブジャンルIDを取得しマッピングを拡張可能
 */
export const CATEGORY_SLUG_TO_RAKUTEN_GENRE: Record<string, number> = {
  // エレキギター本体はエレキギターのサブジャンルIDで絞り込み
  // 参照: https://www.rakuten.co.jp/category/205906/
  "eleki-guitar": 205906,
  "aco-classic-guitar": 205907,
  "bass-body": 205993,
  "bass-effector": 211182,
  "effector-board": 205905,
  "amp-body": 205909,
  "drum-set": 211260,
  "snare-cymbal-pedal": 211233,
  "e-drum": 505086,
  "percussion": RAKUTEN_GENRE_INSTRUMENTS, // 打楽器全般は大ジャンル＋キーワードで対応
  "synth-keyboard": 551197,
  "piano-e-piano": 551197,
  "brass": 204210,
  "woodwind": 204210,
  "strings": 203020,
  "mic": 406336,
  "audio-interface": 206045,
  "monitor-headphone": RAKUTEN_GENRE_INSTRUMENTS, // 近い専用ジャンルがないため大ジャンル
  "dtm-soft": 206024,
  "mixer-pa": 566955,
  "dj-controller": 563796,
  "streaming-gear": 566955,
  "cable-shield": 566957,
  "string-pick-stick": 566957,
  "case-stand": 566957,
  "wagakki": RAKUTEN_GENRE_INSTRUMENTS,
  "custom": RAKUTEN_GENRE_INSTRUMENTS,
};

export function getRakutenGenreIdForCategory(slug: string): number {
  return CATEGORY_SLUG_TO_RAKUTEN_GENRE[slug] ?? RAKUTEN_GENRE_INSTRUMENTS;
}
