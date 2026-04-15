"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, type Firestore } from "firebase/firestore";
import {
  getGroupSlugByCategorySlug,
  isContentOnlyCategorySlug,
} from "@/data/post-categories";
import type { Maker, SpecTag } from "@/types/database";

export const SITUATION_OPTIONS: { id: string; label: string }[] = [
  { id: "home", label: "自宅・宅録" },
  { id: "studio", label: "スタジオ" },
  { id: "livehouse", label: "ライブハウス" },
  { id: "streaming", label: "配信" },
];

type Options = {
  /** Firestore クライアントインスタンス */
  db: Firestore | null;
  /** 編集時の初期値（省略時は空） */
  initial?: Partial<ReviewFormValues>;
};

export type ReviewFormValues = {
  title: string;
  gearName: string;
  categorySlug: string;
  categoryNameJa: string;
  makerName: string;
  rating: number;
  bodyMd: string;
  specTagIds: string[];
  youtubeUrl: string;
  eventUrl: string;
  situations: string[];
  showPreview: boolean;
  previewImageUrls: string[];
  addToOwnedGear: boolean;
};

/**
 * レビュー投稿・編集フォームの共通フィールドを管理するカスタムフック。
 * new/page.tsx と [id]/edit/page.tsx の両方で使用する。
 */
export function useReviewFormFields({ db, initial }: Options) {
  // ── フォームフィールド ──
  const [title, setTitle] = useState(initial?.title ?? "");
  const [gearName, setGearName] = useState(initial?.gearName ?? "");
  const [categorySlug, setCategorySlug] = useState(initial?.categorySlug ?? "");
  const [categoryNameJa, setCategoryNameJa] = useState(initial?.categoryNameJa ?? "");
  const [makerName, setMakerName] = useState(initial?.makerName ?? "");
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [bodyMd, setBodyMd] = useState(initial?.bodyMd ?? "");
  const [specTagIds, setSpecTagIds] = useState<string[]>(initial?.specTagIds ?? []);
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeUrl ?? "");
  const [eventUrl, setEventUrl] = useState(initial?.eventUrl ?? "");
  const [situations, setSituations] = useState<string[]>(initial?.situations ?? []);
  const [showPreview, setShowPreview] = useState(initial?.showPreview ?? false);
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>(
    initial?.previewImageUrls ?? []
  );
  const [addToOwnedGear, setAddToOwnedGear] = useState(initial?.addToOwnedGear ?? true);

  // ── マスタデータ ──
  const [makers, setMakers] = useState<Maker[]>([]);
  const [specTags, setSpecTags] = useState<SpecTag[]>([]);

  // ── 派生値 ──
  const groupSlug = categorySlug ? getGroupSlugByCategorySlug(categorySlug) : "";
  const isContentOnlyCategory = categorySlug ? isContentOnlyCategorySlug(categorySlug) : false;

  // ── メーカー一覧の取得 ──
  useEffect(() => {
    if (!db || !groupSlug) {
      setMakers([]);
      return;
    }
    (async () => {
      const snap = await getDocs(
        query(collection(db, "makers"), where("group_slug", "==", groupSlug))
      );
      const list: Maker[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name ?? "",
            group_slug: data.group_slug ?? "",
            created_at: data.created_at ?? "",
          } as Maker;
        })
        .sort((a, b) => a.name.localeCompare(b.name, "ja"));
      setMakers(list);
    })();
  }, [db, groupSlug]);

  // ── spec タグのトグル ──
  function toggleSpecTag(id: string) {
    setSpecTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // ── 一括セット（編集時の初期値ロード用） ──
  function setAllFields(values: Partial<ReviewFormValues>) {
    if (values.title !== undefined) setTitle(values.title);
    if (values.gearName !== undefined) setGearName(values.gearName);
    if (values.categorySlug !== undefined) setCategorySlug(values.categorySlug);
    if (values.categoryNameJa !== undefined) setCategoryNameJa(values.categoryNameJa);
    if (values.makerName !== undefined) setMakerName(values.makerName);
    if (values.rating !== undefined) setRating(values.rating);
    if (values.bodyMd !== undefined) setBodyMd(values.bodyMd);
    if (values.specTagIds !== undefined) setSpecTagIds(values.specTagIds);
    if (values.youtubeUrl !== undefined) setYoutubeUrl(values.youtubeUrl);
    if (values.eventUrl !== undefined) setEventUrl(values.eventUrl);
    if (values.situations !== undefined) setSituations(values.situations);
    if (values.addToOwnedGear !== undefined) setAddToOwnedGear(values.addToOwnedGear);
  }

  return {
    // フォーム値
    title, setTitle,
    gearName, setGearName,
    categorySlug, setCategorySlug,
    categoryNameJa, setCategoryNameJa,
    makerName, setMakerName,
    rating, setRating,
    bodyMd, setBodyMd,
    specTagIds, setSpecTagIds,
    youtubeUrl, setYoutubeUrl,
    eventUrl, setEventUrl,
    situations, setSituations,
    showPreview, setShowPreview,
    previewImageUrls, setPreviewImageUrls,
    addToOwnedGear, setAddToOwnedGear,
    // マスタ
    makers, setMakers,
    specTags, setSpecTags,
    // 派生
    groupSlug,
    isContentOnlyCategory,
    // ハンドラ
    toggleSpecTag,
    setAllFields,
  };
}
