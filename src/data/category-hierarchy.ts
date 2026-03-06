import { LucideIcon } from "lucide-react";

/**
 * Digimart / Sound House 準拠の3階層カテゴリマスター
 */

export type CategoryLevel1 = { id: string; name: string; icon: string };
export type CategoryLevel2 = { id: string; name: string; parentId: string };
export type CategoryLevel3 = { id: string; name: string; parentId: string };

// ------------------------------------------------------------------
// Level 1: 大カテゴリ (Global Navigation)
// ------------------------------------------------------------------
export const CATEGORY_LEVEL1: CategoryLevel1[] = [
  { id: "guitar", name: "ギター", icon: "Guitar" },
  { id: "bass", name: "ベース", icon: "Guitar" },
  { id: "amp", name: "アンプ", icon: "Speaker" },
  { id: "effector", name: "エフェクター", icon: "SlidersHorizontal" },
  { id: "drum", name: "ドラム・パーカッション", icon: "Drum" },
  { id: "keyboard", name: "ピアノ・シンセ", icon: "Piano" },
  { id: "wind", name: "管楽器", icon: "Music" },
  { id: "string", name: "弦楽器", icon: "Music" },
  { id: "japanese", name: "和楽器", icon: "Music" },
  { id: "dtm", name: "DTM・DAW", icon: "Mic" },
  { id: "dj", name: "DJ & VJ", icon: "Headphones" },
  { id: "stand", name: "スタンド", icon: "Cable" },
  { id: "cable", name: "ケーブル", icon: "Cable" },
  { id: "rack", name: "ラック・ケース", icon: "Cable" },
  { id: "lighting", name: "照明", icon: "Zap" },
  { id: "stage", name: "ステージ", icon: "Zap" },
  { id: "other", name: "その他", icon: "MoreHorizontal" },
];

// ------------------------------------------------------------------
// Level 2: 中カテゴリ (Dropdown Headers)
// ------------------------------------------------------------------
export const CATEGORY_LEVEL2: CategoryLevel2[] = [
  // Guitar
  { id: "electric-guitar", name: "エレキギター", parentId: "guitar" },
  { id: "acoustic-guitar", name: "アコースティックギター", parentId: "guitar" },
  { id: "guitar-parts", name: "ギターパーツ", parentId: "guitar" },
  { id: "guitar-accessory", name: "ギター用アクセサリー", parentId: "guitar" },
  
  // Bass
  { id: "electric-bass", name: "エレキベース", parentId: "bass" },
  { id: "acoustic-bass", name: "アコースティックベース", parentId: "bass" },
  { id: "bass-parts", name: "ベースパーツ", parentId: "bass" },

  // Amp
  { id: "guitar-amp", name: "ギターアンプ", parentId: "amp" },
  { id: "bass-amp", name: "ベースアンプ", parentId: "amp" },
  { id: "keyboard-amp", name: "キーボードアンプ", parentId: "amp" },
  { id: "acoustic-amp", name: "アコースティックアンプ", parentId: "amp" },

  // Effector
  { id: "guitar-effector", name: "ギターエフェクター", parentId: "effector" },
  { id: "bass-effector", name: "ベースエフェクター", parentId: "effector" },
  { id: "switcher", name: "スイッチャー・ルーティング", parentId: "effector" },
  { id: "multi-effector", name: "マルチエフェクター", parentId: "effector" },
  { id: "outboard", name: "アウトボード", parentId: "effector" },

  // Drum
  { id: "drum-set", name: "ドラムセット", parentId: "drum" },
  { id: "snare", name: "スネアドラム", parentId: "drum" },
  { id: "cymbal", name: "シンバル", parentId: "drum" },
  { id: "electronic-drum", name: "電子ドラム", parentId: "drum" },
  { id: "percussion", name: "パーカッション", parentId: "drum" },

  // Keyboard
  { id: "synth", name: "シンセサイザー", parentId: "keyboard" },
  { id: "piano", name: "ピアノ", parentId: "keyboard" },
  { id: "keyboard-acc", name: "アクセサリー", parentId: "keyboard" },

  // DTM
  { id: "audio-interface", name: "オーディオIF", parentId: "dtm" },
  { id: "daw-soft", name: "DAWソフト", parentId: "dtm" },
  { id: "monitor", name: "モニター・ヘッドホン", parentId: "dtm" },
  { id: "mic", name: "マイク", parentId: "dtm" },

  // Other (Content)
  { id: "custom-root", name: "カスタム手帳", parentId: "other" },
  { id: "blog-root", name: "ブログ", parentId: "other" },
  { id: "event-root", name: "イベント", parentId: "other" },
];

// ------------------------------------------------------------------
// Level 3: 小カテゴリ (Leaf Items)
// ------------------------------------------------------------------
export const CATEGORY_LEVEL3: CategoryLevel3[] = [
  // Electric Guitar
  { id: "stratocaster", name: "ストラトキャスタータイプ", parentId: "electric-guitar" },
  { id: "telecaster", name: "テレキャスタータイプ", parentId: "electric-guitar" },
  { id: "les-paul", name: "レスポールタイプ", parentId: "electric-guitar" },
  { id: "sg", name: "SGタイプ", parentId: "electric-guitar" },
  { id: "jazzmaster", name: "ジャズマスタータイプ", parentId: "electric-guitar" },
  { id: "jaguar", name: "ジャガータイプ", parentId: "electric-guitar" },
  { id: "mustang", name: "ムスタングタイプ", parentId: "electric-guitar" },
  { id: "firebird", name: "ファイヤーバードタイプ", parentId: "electric-guitar" },
  { id: "explorer", name: "エクスプローラータイプ", parentId: "electric-guitar" },
  { id: "flying-v", name: "フライングVタイプ", parentId: "electric-guitar" },
  { id: "hollow-body", name: "セミアコ/フルアコ", parentId: "electric-guitar" },
  { id: "7-8-string", name: "多弦ギター", parentId: "electric-guitar" },
  { id: "mini-guitar", name: "ミニギター", parentId: "electric-guitar" },
  { id: "lefty-guitar", name: "レフティ", parentId: "electric-guitar" },

  // Acoustic Guitar
  { id: "dreadnought", name: "ドレッドノートタイプ", parentId: "acoustic-guitar" },
  { id: "000-om", name: "000/OMタイプ", parentId: "acoustic-guitar" },
  { id: "ele-aco", name: "エレアコ", parentId: "acoustic-guitar" },
  { id: "classic-guitar", name: "クラシック/ガット", parentId: "acoustic-guitar" },

  // Electric Bass
  { id: "jazz-bass", name: "ジャズベースタイプ", parentId: "electric-bass" },
  { id: "precision-bass", name: "プレシジョンベースタイプ", parentId: "electric-bass" },
  { id: "pj-bass", name: "PJタイプ", parentId: "electric-bass" },
  { id: "active-bass", name: "アクティブベース", parentId: "electric-bass" },
  { id: "5-6-string-bass", name: "多弦ベース", parentId: "electric-bass" },
  { id: "fretless", name: "フレットレス", parentId: "electric-bass" },
  { id: "lefty-bass", name: "レフティ", parentId: "electric-bass" },

  // Guitar Amp
  { id: "tube-amp-head", name: "真空管ヘッド", parentId: "guitar-amp" },
  { id: "tube-combo", name: "真空管コンボ", parentId: "guitar-amp" },
  { id: "solid-amp-head", name: "ソリッドヘッド", parentId: "guitar-amp" },
  { id: "solid-combo", name: "ソリッドコンボ", parentId: "guitar-amp" },
  { id: "cabinet", name: "キャビネット", parentId: "guitar-amp" },
  { id: "preamp", name: "プリアンプ", parentId: "guitar-amp" },

  // Guitar Effector
  { id: "buffer", name: "バッファ", parentId: "guitar-effector" },
  { id: "overdrive", name: "オーバードライブ", parentId: "guitar-effector" },
  { id: "distortion", name: "ディストーション", parentId: "guitar-effector" },
  { id: "fuzz", name: "ファズ", parentId: "guitar-effector" },
  { id: "booster", name: "ブースター", parentId: "guitar-effector" },
  { id: "delay", name: "ディレイ", parentId: "guitar-effector" },
  { id: "reverb", name: "リバーブ", parentId: "guitar-effector" },
  { id: "chorus", name: "コーラス", parentId: "guitar-effector" },
  { id: "phaser", name: "フェイザー", parentId: "guitar-effector" },
  { id: "flanger", name: "フランジャー", parentId: "guitar-effector" },
  { id: "tremolo", name: "トレモロ", parentId: "guitar-effector" },
  { id: "compressor", name: "コンプレッサー", parentId: "guitar-effector" },
  { id: "wah", name: "ワウ", parentId: "guitar-effector" },
  { id: "eq", name: "イコライザー", parentId: "guitar-effector" },
  { id: "volume-pedal", name: "ボリュームペダル", parentId: "guitar-effector" },
  { id: "tuner", name: "チューナー", parentId: "guitar-effector" },
  { id: "looper", name: "ルーパー", parentId: "guitar-effector" },

  // Bass Effector
  { id: "buffer", name: "バッファ", parentId: "bass-effector" },

  // Content
  { id: "custom", name: "カスタム手帳", parentId: "custom-root" },
  { id: "blog", name: "ブログ", parentId: "blog-root" },
  { id: "event", name: "イベント", parentId: "event-root" },
];

/**
 * Slug生成ルール: level2-id__level3-id
 * level3-id がユニークならそれだけでも良いが、衝突防止と構造化のため親子を含める
 * コンテンツ系（custom, blog等）は level2 と level3 が重複気味だが、統一フォーマットにする
 */
export function toCategorySlug(level2Id: string, level3Id: string): string {
  return `${level2Id}__${level3Id}`;
}

export function parseCategorySlug(slug: string): { parentId: string; childId: string } | null {
  if (!slug) return null;
  const idx = slug.indexOf("__");
  if (idx >= 0) {
    return { parentId: slug.slice(0, idx), childId: slug.slice(idx + 2) };
  }
  // 既存データ（Level 2のみのslugなど）への対応が必要ならここでハンドリング
  return null;
}

export function getParentById(id: string): CategoryLevel1 | undefined {
  return CATEGORY_LEVEL1.find((p) => p.id === id);
}

// ------------------------------------------------------------------
// UI Helper
// ------------------------------------------------------------------

export type CategoryHierarchyItem = CategoryLevel1 & {
  children: (CategoryLevel2 & {
    items: CategoryLevel3[];
  })[];
};

export const FULL_CATEGORY_HIERARCHY: CategoryHierarchyItem[] = CATEGORY_LEVEL1.map((l1) => {
  const l2List = CATEGORY_LEVEL2.filter((l2) => l2.parentId === l1.id);
  return {
    ...l1,
    children: l2List.map((l2) => {
      const l3List = CATEGORY_LEVEL3.filter((l3) => l3.parentId === l2.id);
      return {
        ...l2,
        items: l3List,
      };
    }),
  };
});

// ------------------------------------------------------------------
// Legacy Exports for Compatibility (Alias Level 1/2 to Parent/Child temporarily)
// ------------------------------------------------------------------
// 既存のコードが PARENT_CATEGORIES を import しているため
export const PARENT_CATEGORIES = CATEGORY_LEVEL1;
export const CHILD_CATEGORIES = CATEGORY_LEVEL2.map(c => ({
  id: c.id,
  name: c.name,
  parentId: c.parentId,
})); // 既存型に合わせるため

/**
 * 表示用ラベル取得（New Review dropdown などで使用）
 * 新仕様: Level 2 Name > Level 3 Name
 */
export function getCategoryDisplayLabel(slug: string): string {
  const parsed = parseCategorySlug(slug);
  if (!parsed) {
    // マッチしない場合、Level 3 ID で直接検索（古いslugや単体IDの場合）
    const l3Direct = CATEGORY_LEVEL3.find(c => c.id === slug);
    if (l3Direct) {
      const l2 = CATEGORY_LEVEL2.find(c => c.id === l3Direct.parentId);
      return l2 ? `${l2.name} > ${l3Direct.name}` : l3Direct.name;
    }
    return slug;
  }
  
  const l2 = CATEGORY_LEVEL2.find(c => c.id === parsed.parentId);
  const l3 = CATEGORY_LEVEL3.find(c => c.id === parsed.childId);
  
  if (l2 && l3) {
    return `${l2.name} > ${l3.name}`;
  }
  return slug;
}

export function getCategoryParentName(slug: string): string {
  const parsed = parseCategorySlug(slug);
  if (!parsed) return "その他";
  const l2 = CATEGORY_LEVEL2.find(c => c.id === parsed.parentId);
  return l2?.name ?? "その他";
}

export function getCategoryParentIconName(slug: string): string {
  const parsed = parseCategorySlug(slug);
  if (!parsed) return "MoreHorizontal";
  const l2 = CATEGORY_LEVEL2.find(c => c.id === parsed.parentId);
  if (!l2) return "MoreHorizontal";
  const l1 = CATEGORY_LEVEL1.find(c => c.id === l2.parentId);
  return l1?.icon ?? "MoreHorizontal";
}

/** 
 * Dropdown 用: 全ての選択可能なオプション (Level 3 Items)
 */
export type CategoryOption = { slug: string; parentId: string; parentName: string; childId: string; childName: string; icon: string };

export function getAllCategoryOptions(): CategoryOption[] {
  const out: CategoryOption[] = [];
  for (const l3 of CATEGORY_LEVEL3) {
    const l2 = CATEGORY_LEVEL2.find(c => c.id === l3.parentId);
    if (!l2) continue;
    const l1 = CATEGORY_LEVEL1.find(c => c.id === l2.parentId);
    
    out.push({
      slug: toCategorySlug(l2.id, l3.id), // Level 2 ID __ Level 3 ID
      parentId: l2.id,
      parentName: l2.name,
      childId: l3.id,
      childName: l3.name,
      icon: l1?.icon ?? "Circle",
    });
  }
  return out;
}

// ------------------------------------------------------------------
// Legacy Mappings (Old Slug -> New Slug)
// ------------------------------------------------------------------
export const LEGACY_SLUG_TO_NEW: Record<string, string> = {
  // Existing: instrument__eleki-guitar -> New: electric-guitar__stratocaster (???)
  // マッピングが 1:1 でないため、適切なデフォルト（その他）に寄せる
  "eleki-guitar": "electric-guitar__other-electric-guitar",
  "guitar-effector": "guitar-effector__distortion", // 仮
  // ... 必要に応じて追加
};

// 検索用（タグ機能は廃止または統合されるため、ここでは一旦空に）
export const DETAIL_TAGS = [];
export function getTagsByChildId(id: string) { return []; }
