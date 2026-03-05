/** 投稿画面用カテゴリ一覧（グループ＋項目）。slug は Firestore の category_slug と一致させる */
export type PostCategoryItem = { slug: string; name_ja: string };
export type PostCategoryGroup = { groupLabel: string; groupSlug: string; items: PostCategoryItem[] };

/** groupSlug はメーカー取得用（makers.group_slug） */
export const POST_CATEGORY_GROUPS: PostCategoryGroup[] = [
  {
    groupLabel: "🎸 ギター・ベース系",
    groupSlug: "guitar-bass",
    items: [
      { slug: "eleki-guitar", name_ja: "エレキギター本体" },
      { slug: "guitar-effector", name_ja: "ギターエフェクター" },
      { slug: "aco-classic-guitar", name_ja: "アコースティック・クラシックギター" },
      { slug: "bass-body", name_ja: "ベース本体" },
      { slug: "bass-effector", name_ja: "ベースエフェクター" },
      { slug: "effector-board", name_ja: "エフェクターボード周辺（電源・スイッチャー等）" },
      { slug: "amp-body", name_ja: "アンプ本体" },
    ],
  },
  {
    groupLabel: "🥁 打楽器・リズム系",
    groupSlug: "drums",
    items: [
      { slug: "drum-set", name_ja: "ドラムセット本体" },
      { slug: "snare-cymbal-pedal", name_ja: "スネア・シンバル・ペダル" },
      { slug: "e-drum", name_ja: "電子ドラム" },
      { slug: "percussion", name_ja: "パーカッション（カホン・コンガ等）" },
    ],
  },
  {
    groupLabel: "🎹 鍵盤楽器系",
    groupSlug: "keyboards-synths",
    items: [
      { slug: "synth-keyboard", name_ja: "シンセサイザー・キーボード" },
      { slug: "piano-e-piano", name_ja: "ピアノ・電子ピアノ" },
    ],
  },
  {
    groupLabel: "🎺 管楽器・弦楽器系",
    groupSlug: "other",
    items: [
      { slug: "brass", name_ja: "金管楽器（トランペット・トロンボーン等）" },
      { slug: "woodwind", name_ja: "木管楽器（サックス・フルート等）" },
      { slug: "strings", name_ja: "擦弦楽器（バイオリン・チェロ等）" },
    ],
  },
  {
    groupLabel: "🎙️ PA・レコーディング・DTM系",
    groupSlug: "other",
    items: [
      { slug: "mic", name_ja: "マイク・マイク周辺機器" },
      { slug: "audio-interface", name_ja: "オーディオインターフェース" },
      { slug: "monitor-headphone", name_ja: "モニタースピーカー・ヘッドホン" },
      { slug: "dtm-soft", name_ja: "DTMソフト（DAW・プラグイン）" },
      { slug: "mixer-pa", name_ja: "ミキサー・PA機材" },
    ],
  },
  {
    groupLabel: "🎧 DJ・配信系",
    groupSlug: "other",
    items: [
      { slug: "dj-controller", name_ja: "DJコントローラー・ターンテーブル" },
      { slug: "streaming-gear", name_ja: "配信用機材（キャプボ・ミキサー等）" },
    ],
  },
  {
    groupLabel: "🔌 アクセサリー・その他",
    groupSlug: "other",
    items: [
      { slug: "cable-shield", name_ja: "ケーブル・シールド" },
      { slug: "string-pick-stick", name_ja: "弦・ピック・スティック" },
      { slug: "case-stand", name_ja: "ケース・スタンド類" },
      { slug: "wagakki", name_ja: "和楽器・民族楽器" },
    ],
  },
  {
    groupLabel: "📋 その他",
    groupSlug: "other",
    items: [
      { slug: "custom", name_ja: "カスタム" },
      { slug: "blog", name_ja: "ブログ" },
      { slug: "photo", name_ja: "フォト" },
      { slug: "event", name_ja: "イベント" },
    ],
  },
];

/** 全カテゴリをフラットに（slug → name_ja, groupSlug） */
export const POST_CATEGORIES_FLAT: { slug: string; name_ja: string; groupSlug: string }[] =
  POST_CATEGORY_GROUPS.flatMap((g) =>
    g.items.map((i) => ({ slug: i.slug, name_ja: i.name_ja, groupSlug: g.groupSlug }))
  );

export function getGroupSlugByCategorySlug(categorySlug: string): string {
  return POST_CATEGORIES_FLAT.find((c) => c.slug === categorySlug)?.groupSlug ?? "other";
}

/** 機材名・メーカー・評価が不要な「その他」系コンテンツカテゴリ */
export const CONTENT_ONLY_CATEGORY_SLUGS = ["custom", "blog", "photo", "event"] as const;

export function isContentOnlyCategorySlug(slug: string): boolean {
  return (CONTENT_ONLY_CATEGORY_SLUGS as readonly string[]).includes(slug);
}
