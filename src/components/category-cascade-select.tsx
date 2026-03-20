"use client";

import { useState, useEffect, useCallback } from "react";
import { MEGA_MENU_CATEGORIES } from "@/data/rakuten-genres";

/** 階層を持たない独立カテゴリ（1つ目で選択時点で確定） */
const STANDALONE_CATEGORIES: { slug: string; mainCategory: string }[] = [
  { slug: "blog", mainCategory: "ブログ" },
  { slug: "event", mainCategory: "イベント" },
  { slug: "custom", mainCategory: "カスタム手帳" },
];

/** 3階層選択時の slug 生成（一意になるようパスを結合） */
function buildSlug(mainCategory: string, subGroupTitle: string, item: string): string {
  const safe = (s: string) => s.replace(/\s+/g, "-").replace(/[\/\\?&#]/g, "");
  return `${safe(mainCategory)}__${safe(subGroupTitle)}__${safe(item)}`;
}

// buildSlug と同じ「slug 化」ロジックを復元側でも使うことで、
// `xxx / YYY` のような記号を含む詳細タイプでも選択が維持されるようにする。
function safeForSlug(s: string): string {
  return (s ?? "")
    .replace(/\s+/g, "-")
    .replace(/[\/\\?&#]/g, "");
}

/** 第1階層の選択肢：MEGA_MENU の mainCategory + 独立カテゴリ */
const MAIN_OPTIONS: { type: "mega"; index: number; label: string }[] = MEGA_MENU_CATEGORIES.map(
  (c, i) => ({ type: "mega" as const, index: i, label: c.mainCategory })
);
const STANDALONE_OPTIONS: { type: "standalone"; slug: string; label: string }[] =
  STANDALONE_CATEGORIES.map((c) => ({
    type: "standalone" as const,
    slug: c.slug,
    label: c.mainCategory,
  }));
const ALL_MAIN_OPTIONS = [...MAIN_OPTIONS, ...STANDALONE_OPTIONS];

export type CategoryCascadeSelectProps = {
  value: string;
  onChange: (slug: string, name_ja: string) => void;
  id?: string;
  required?: boolean;
  placeholderMain?: string;
  placeholderSub?: string;
  placeholderItem?: string;
  /** セレクト上にある補足テキスト（未指定時は非表示） */
  hintText?: string;
  /** 3階層すべて選択時にラベルパス（main__sub__item）を渡す。所有機材等で DB に __ 区切りで保存する場合に使用 */
  onLabelPathChange?: (path: string) => void;
};

export function CategoryCascadeSelect({
  value,
  onChange,
  id,
  required,
  placeholderMain = "ギター、ベース、エフェクター等を選択...",
  placeholderSub = "エレキギター、ベースアンプ等を選択...",
  placeholderItem = "さらに詳細なタイプを選択...",
  hintText = "レビューする機材のジャンルを絞り込んでください",
  onLabelPathChange,
}: CategoryCascadeSelectProps) {
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>("");
  const [selectedSubGroup, setSelectedSubGroup] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<string>("");

  const mainOpt = ALL_MAIN_OPTIONS.find((o) => o.label === selectedMainCategory);
  const selectedMegaIndex =
    mainOpt?.type === "mega" ? mainOpt.index : -1;
  const selectedMega = selectedMegaIndex >= 0 ? MEGA_MENU_CATEGORIES[selectedMegaIndex] : null;
  const isStandalone = STANDALONE_OPTIONS.some((o) => o.label === selectedMainCategory);
  const subGroups = selectedMega?.subGroups ?? [];
  const activeSubGroupData = subGroups.find((sg) => sg.title === selectedSubGroup);
  const items = activeSubGroupData?.items ?? [];

  const emitChange = useCallback(
    (slug: string, name_ja: string) => {
      onChange(slug, name_ja);
    },
    [onChange]
  );

  // 親から降ってくる value を split('__') で分割し、要素数に応じてローカル state を復元する
  useEffect(() => {
    const trimmed = (value ?? "").trim();
    if (!trimmed) {
      setSelectedMainCategory("");
      setSelectedSubGroup("");
      setSelectedItem("");
      return;
    }

    // 独立カテゴリ（blog / event / custom）
    const standalone = STANDALONE_CATEGORIES.find((c) => c.slug === trimmed || c.mainCategory === trimmed);
    if (standalone) {
      setSelectedMainCategory(standalone.mainCategory);
      setSelectedSubGroup("");
      setSelectedItem("");
      return;
    }

    const parts = trimmed.split("__").map((p) => (p ?? "").trim());
    const [megaStr, subStr, itemStr] = parts;

    // megaStr がマスタに存在するか確認し、順に state を復元
    const mega = MEGA_MENU_CATEGORIES.find(
      (c) =>
        safeForSlug(c.mainCategory) === megaStr ||
        c.mainCategory === megaStr ||
        c.mainCategory === (megaStr?.replace(/-/g, " ") ?? "") ||
        c.mainCategory.replace(/\s/g, "-") === megaStr
    );
    if (!mega) {
      setSelectedMainCategory("");
      setSelectedSubGroup("");
      setSelectedItem("");
      return;
    }
    setSelectedMainCategory(mega.mainCategory);

    if (subStr) {
      const sg = mega.subGroups.find(
        (s) =>
          safeForSlug(s.title) === subStr ||
          s.title === subStr ||
          s.title === (subStr?.replace(/-/g, " ") ?? "") ||
          s.title.replace(/\s/g, "-") === subStr
      );
      if (sg) {
        setSelectedSubGroup(sg.title);
        if (itemStr) {
          const it = sg.items.find(
            (i) =>
              safeForSlug(i) === itemStr ||
              i === itemStr ||
              i === (itemStr?.replace(/-/g, " ") ?? "") ||
              i.replace(/\s/g, "-") === itemStr
          );
          setSelectedItem(it ?? "");
        } else {
          setSelectedItem("");
        }
      } else {
        setSelectedSubGroup("");
        setSelectedItem("");
      }
    } else {
      setSelectedSubGroup("");
      setSelectedItem("");
    }
  }, [value]);

  const handleMainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setSelectedMainCategory(v);
    setSelectedSubGroup("");
    setSelectedItem("");
    if (!v) {
      onChange("", "");
      onLabelPathChange?.("");
      return;
    }
    const standalone = STANDALONE_OPTIONS.find((o) => o.label === v);
    if (standalone) {
      emitChange(standalone.slug, standalone.label);
      onLabelPathChange?.(standalone.slug);
    } else {
      onChange("", "");
      onLabelPathChange?.(v);
    }
  };

  const handleSubGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setSelectedSubGroup(v);
    setSelectedItem("");
    if (v) {
      onLabelPathChange?.(`${selectedMainCategory}__${v}`);
    } else {
      onLabelPathChange?.(selectedMainCategory);
    }
  };

  const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setSelectedItem(v);
    if (v) {
      onLabelPathChange?.(`${selectedMainCategory}__${selectedSubGroup}__${v}`);
      if (selectedMega && activeSubGroupData) {
        const slug = buildSlug(selectedMega.mainCategory, activeSubGroupData.title, v);
        emitChange(slug, v);
      }
    } else {
      onLabelPathChange?.(`${selectedMainCategory}__${selectedSubGroup}`);
    }
  };

  const selectClass =
    "w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500";

  return (
    <div className="space-y-3" id={id}>
      {hintText && (
        <p className="text-xs text-gray-500">{hintText}</p>
      )}
      <div className="space-y-1">
        <label htmlFor={id ? `${id}-main` : undefined} className="text-xs font-medium text-gray-400">
          機材ジャンル
        </label>
        <select
          id={id ? `${id}-main` : undefined}
          value={selectedMainCategory}
          onChange={handleMainChange}
          required={required}
          className={selectClass}
          aria-label="機材ジャンル"
        >
          <option value="">{placeholderMain}</option>
          {ALL_MAIN_OPTIONS.map((opt) =>
            opt.type === "mega" ? (
              <option key={`mega-${opt.index}`} value={opt.label}>
                {opt.label}
              </option>
            ) : (
              <option key={`standalone-${opt.slug}`} value={opt.label}>
                {opt.label}
              </option>
            )
          )}
        </select>
      </div>

      {selectedMega && subGroups.length > 0 && (
        <div className="space-y-1">
          <label
            htmlFor={id ? `${id}-sub` : undefined}
            className="text-xs font-medium text-gray-400"
          >
            種類・用途
          </label>
          <select
            id={id ? `${id}-sub` : undefined}
            value={selectedSubGroup}
            onChange={handleSubGroupChange}
            className={selectClass}
            aria-label="種類・用途"
          >
            <option value="">{placeholderSub}</option>
            {subGroups.map((sg) => (
              <option key={sg.title} value={sg.title}>
                {sg.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {activeSubGroupData && items.length > 0 && (
        <div className="space-y-1">
          <label
            htmlFor={id ? `${id}-item` : undefined}
            className="text-xs font-medium text-gray-400"
          >
            詳細タイプ (必須)
          </label>
          <select
            id={id ? `${id}-item` : undefined}
            value={selectedItem}
            onChange={handleItemChange}
            required={required && !isStandalone}
            className={selectClass}
            aria-label="詳細タイプ (必須)"
          >
            <option value="">{placeholderItem}</option>
            {items.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      )}

      {isStandalone && (
        <p className="text-xs text-gray-500">
          このカテゴリは大カテゴリの選択で確定しています。
        </p>
      )}
    </div>
  );
}
