"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore, getFirebaseStorage } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryCascadeSelect } from "@/components/category-cascade-select";
import {
  getGroupSlugByCategorySlug,
  getCategoryLabel,
  isContentOnlyCategorySlug,
  normalizeCategorySlug,
} from "@/data/post-categories";
import { getPendingGear, clearPendingGear } from "@/lib/pending-gear";

const REVIEW_TITLE_MAX = 100;
const REVIEW_BODY_MAX = 2000;
import { ReviewFormPreview, type ReviewPreviewData } from "@/components/review-form-preview";
import { BodyTextareaWithAi } from "@/components/body-textarea-with-ai";
import type { Maker } from "@/types/database";
import type { SpecTag } from "@/types/database";
import { buildReviewShareText } from "@/lib/x-share";
import toast from "react-hot-toast";

export default function NewReviewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseFirestore();
  const storage = getFirebaseStorage();
  const [makers, setMakers] = useState<Maker[]>([]);
  const [specTags, setSpecTags] = useState<SpecTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [gearName, setGearName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [categoryNameJa, setCategoryNameJa] = useState("");
  const [makerName, setMakerName] = useState("");
  const [rating, setRating] = useState(5);
  const [bodyMd, setBodyMd] = useState("");
  const [specTagIds, setSpecTagIds] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [eventUrl, setEventUrl] = useState("");
  const [situations, setSituations] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([]);
  /** 機材レビュー時のみ。マイページの所持機材に追加するか */
  const [addToOwnedGear, setAddToOwnedGear] = useState(true);
  /** 投稿後にXでシェアするか（intentで投稿画面を開く） */
  const [shareToXAfterSubmit, setShareToXAfterSubmit] = useState(false);
  /** 楽天API等から渡された未登録機材（レビューSubmit時に gears + reviews を同時保存） */
  const [pendingGearFromApi, setPendingGearFromApi] = useState<{
    name: string;
    imageUrl: string;
    affiliateUrl: string;
    categorySlug?: string;
    categoryNameJa?: string;
  } | null>(null);

  const SITUATION_OPTIONS: { id: string; label: string }[] = [
    { id: "home", label: "自宅・宅録" },
    { id: "studio", label: "スタジオ" },
    { id: "livehouse", label: "ライブハウス" },
    { id: "streaming", label: "配信" },
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const categoryFromUrl = params.get("category") ?? "";
    const manufacturerFromUrl = params.get("manufacturer") ?? "";
    const gearNameFromUrl = params.get("gear_name") ?? "";

    if (categoryFromUrl) {
      const normalized = normalizeCategorySlug(categoryFromUrl) || categoryFromUrl;
      setCategorySlug((prev) => prev || normalized);
      if (!categoryNameJa) setCategoryNameJa(getCategoryLabel(categoryFromUrl));
    }
    if (manufacturerFromUrl) {
      setMakerName((prev) => prev || manufacturerFromUrl);
    }
    if (gearNameFromUrl) {
      setGearName((prev) => prev || gearNameFromUrl);
    }

    if (params.get("from") !== "rakuten") return;
    const pending = getPendingGear();
    if (pending) {
      setPendingGearFromApi(pending);
      setGearName(pending.name);
      if (pending.categorySlug) setCategorySlug(pending.categorySlug);
      if (pending.categoryNameJa) setCategoryNameJa(pending.categoryNameJa);
    }
  }, [categoryNameJa]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      window.location.href = `/login?next=${encodeURIComponent("/reviews/new")}`;
      return;
    }
    if (!db) {
      setLoading(false);
      return;
    }
    (async () => {
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      const profile = profileSnap.data();
      const userIdSet = profile && profile.user_id != null && String(profile.user_id).trim() !== "";
      if (!userIdSet) {
        setLoading(false);
        window.location.href = `/profile?next=${encodeURIComponent("/reviews/new")}`;
        return;
      }
      const tagSnap = await getDocs(collection(db, "spec_tags"));
      const tags: SpecTag[] = tagSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          slug: data.slug ?? "",
          name_ja: data.name_ja ?? "",
          created_at: data.created_at ?? "",
        } as SpecTag;
      });
      setSpecTags(tags);
      setLoading(false);
    })();
  }, [user, authLoading, db]);

  const groupSlug = categorySlug ? getGroupSlugByCategorySlug(categorySlug) : "";
  const isContentOnlyCategory = categorySlug ? isContentOnlyCategorySlug(categorySlug) : false;

  useEffect(() => {
    if (!db || !groupSlug) {
      setMakers([]);
      return;
    }
    (async () => {
      // where のみで取得（複合インデックス不要）。名前順はクライアントでソート
      const snap = await getDocs(
        query(
          collection(db, "makers"),
          where("group_slug", "==", groupSlug)
        )
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

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setFilePreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  /** 未登録機材＋レビューを同時保存（Submit時のみDBに書き込む） */
  function validateLengths(): boolean {
    if (title.length > REVIEW_TITLE_MAX || bodyMd.length > REVIEW_BODY_MAX) {
      setError(
        `タイトルは${REVIEW_TITLE_MAX}文字以内、本文は${REVIEW_BODY_MAX.toLocaleString()}文字以内で入力してください。`
      );
      return false;
    }
    return true;
  }

  async function handleSubmitWithNewGear(pending: {
    name: string;
    imageUrl: string;
    affiliateUrl: string;
    categorySlug?: string;
    categoryNameJa?: string;
  }) {
    if (!user || !db) return;
    if (!validateLengths()) return;
    setSubmitting(true);
    setError(null);
    try {
      const idToken = await user.getIdToken(true);
      const res = await fetch("/api/reviews/with-gear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          gear: {
            name: pending.name,
            imageUrl: pending.imageUrl,
            affiliateUrl: pending.affiliateUrl,
          },
          review: {
            categorySlug,
            categoryNameJa,
            title: title.trim(),
            gearName: gearName.trim() || pending.name,
            makerName: makerName.trim(),
            rating: isContentOnlyCategory ? 0 : rating,
            bodyMd: bodyMd.trim(),
            youtubeUrl: youtubeUrl.trim() || undefined,
            eventUrl: categorySlug === "event" ? eventUrl.trim() || undefined : undefined,
            situations: situations.length > 0 ? situations : undefined,
            specTagIds,
            addToOwnedGear: addToOwnedGear && !isContentOnlyCategory,
          },
        }),
      });
      const data = (await res.json()) as { reviewId?: string; gearId?: string; error?: string };
      if (!res.ok || !data.reviewId) {
        setError(data.error ?? "保存に失敗しました。");
        return;
      }
      const reviewId = data.reviewId;

      if (storage && files.length > 0) {
        const reviewImages: { storage_path: string; sort_order: number }[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const ext = file.name.split(".").pop() ?? "jpg";
          const storagePath = `review-images/${reviewId}/${Date.now()}-${i}.${ext}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, file, {
            cacheControl: "public, max-age=31536000, immutable",
            contentType: file.type || undefined,
          });
          reviewImages.push({ storage_path: storagePath, sort_order: i });
        }
        await updateDoc(doc(db, "reviews", reviewId), {
          review_images: reviewImages,
          updated_at: new Date().toISOString(),
        });
      }

      clearPendingGear();
      setPendingGearFromApi(null);

      if (shareToXAfterSubmit && typeof window !== "undefined") {
        const reviewUrl = `${window.location.origin}/reviews/${reviewId}`;
        const baseText = buildReviewShareText({
          title: title.trim() || pending.name,
          makerName: makerName.trim() || undefined,
          gearName: gearName.trim() || pending.name,
          categoryNameJa: categoryNameJa || undefined,
          categorySlug: categorySlug || undefined,
          sharedByOwner: true,
        });
        const shareUrl = `https://twitter.com/intent/tweet?${new URLSearchParams({
          text: `${baseText}\n${reviewUrl}`,
        }).toString()}`;
        window.open(shareUrl, "_blank", "noopener,noreferrer");
      }
      router.push(`/reviews/${reviewId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !db) return;
    setError(null);

    if (!categorySlug || !categoryNameJa) {
      setError("カテゴリを選択してください。");
      toast.error("必須項目を入力してください");
      return;
    }
    if (!title.trim()) {
      setError("タイトルを入力してください。");
      toast.error("必須項目を入力してください");
      return;
    }
    if (!isContentOnlyCategory && !gearName.trim()) {
      setError("機材名を入力してください。");
      toast.error("必須項目を入力してください");
      return;
    }
    if (!bodyMd.trim()) {
      setError("本文を入力してください。");
      toast.error("必須項目を入力してください");
      return;
    }
    if (!validateLengths()) {
      toast.error("必須項目を入力してください");
      return;
    }

    const pending = pendingGearFromApi ?? getPendingGear();
    if (pending) {
      await handleSubmitWithNewGear(pending);
      return;
    }

    setSubmitting(true);
    try {
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      const profile = profileSnap.data();
      const authorDisplayName = profile?.display_name ?? user.email?.split("@")[0] ?? "";
      const authorUserId = profile?.user_id ?? null;

      let makerId: string | null = null;
      const name = makerName.trim();
      if (name && groupSlug) {
        const existingSnap = await getDocs(
          query(
            collection(db, "makers"),
            where("group_slug", "==", groupSlug),
            where("name", "==", name)
          )
        );
        if (!existingSnap.empty) {
          makerId = existingSnap.docs[0].id;
        } else {
          const makerRef = await addDoc(collection(db, "makers"), {
            name,
            group_slug: groupSlug,
            created_at: new Date().toISOString(),
          });
          makerId = makerRef.id;
        }
      }

      const specTagNames = specTagIds
        .map((id) => specTags.find((t) => t.id === id)?.name_ja)
        .filter(Boolean) as string[];

      const reviewRef = await addDoc(collection(db, "reviews"), {
        author_id: user.uid,
        category_id: categorySlug,
        ...(makerId && { maker_id: makerId }),
        maker_name: isContentOnlyCategory ? null : (makerName.trim() || null),
        category_name_ja: categoryNameJa,
        category_slug: categorySlug,
        author_display_name: authorDisplayName,
        author_user_id: authorUserId,
        author_avatar_url: profile?.avatar_url ?? null,
        title: title.trim(),
        gear_name: isContentOnlyCategory ? "" : gearName.trim(),
        rating: isContentOnlyCategory ? 0 : rating,
        body_md: bodyMd.trim() || null,
        body_html: null,
        youtube_url: youtubeUrl.trim() || null,
        event_url: categorySlug === "event" ? (eventUrl.trim() || null) : null,
        situations: situations.length > 0 ? situations : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        spec_tag_ids: specTagIds,
        spec_tag_names: specTagNames,
        review_images: [],
      });

      const reviewImages: { storage_path: string; sort_order: number }[] = [];
      if (storage && files.length > 0) {
        const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const ext = file.name.split(".").pop() ?? "jpg";
          const storagePath = `review-images/${reviewRef.id}/${Date.now()}-${i}.${ext}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, file, {
            cacheControl: "public, max-age=31536000, immutable",
            contentType: file.type || undefined,
          });
          reviewImages.push({ storage_path: storagePath, sort_order: i });
        }
        await updateDoc(reviewRef, {
          review_images: reviewImages,
          updated_at: new Date().toISOString(),
        });
      }

      if (addToOwnedGear && !isContentOnlyCategory && gearName.trim()) {
        const currentOwnedGear = (profile?.owned_gear as string | undefined) ?? "";
        const makerPart = makerName.trim();
        const lineCore = makerPart ? `${makerPart} / ${gearName.trim()}` : gearName.trim();
        const newLine = categoryNameJa ? `[${categoryNameJa}] ${lineCore}` : lineCore;
        const existingLines = currentOwnedGear
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (!existingLines.includes(newLine)) {
          const newText = currentOwnedGear ? `${currentOwnedGear}\n${newLine}` : newLine;
          await setDoc(
            doc(db, "profiles", user.uid),
            { owned_gear: newText.trim() || null, updated_at: new Date().toISOString() },
            { merge: true }
          );
        }
      }

      if (shareToXAfterSubmit && typeof window !== "undefined") {
        const reviewUrl = `${window.location.origin}/reviews/${reviewRef.id}`;
        const baseText = buildReviewShareText({
          title: title.trim() || undefined,
          makerName: makerName.trim() || undefined,
          gearName: gearName.trim() || undefined,
          categoryNameJa: categoryNameJa || undefined,
          categorySlug: categorySlug || undefined,
          sharedByOwner: true,
        });
        const shareUrl = `https://twitter.com/intent/tweet?${new URLSearchParams({
          text: `${baseText}\n${reviewUrl}`,
        }).toString()}`;
        window.open(shareUrl, "_blank", "noopener,noreferrer");
      }

      router.push(`/reviews/${reviewRef.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "投稿に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleSpecTag(id: string) {
    setSpecTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            読み込み中...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      <h1 className="text-2xl font-bold text-white mb-6">レビューを投稿</h1>
      {(pendingGearFromApi ?? getPendingGear()) && (
        <Card className="mb-6 border-electric-blue/50 bg-electric-blue/5 p-4">
          <p className="text-sm text-gray-200">
            この機材でレビューを投稿すると、機材がサイトに登録され、今回のレビューと紐づきます。投稿を確定するまで機材は保存されません。
          </p>
        </Card>
      )}
      <form onSubmit={handleSubmit}>
        <Card className="space-y-6 p-6">
          <div className="space-y-2">
            <Label htmlFor="category">カテゴリ（必須）</Label>
            <CategoryCascadeSelect
              id="category"
              value={categorySlug}
              onChange={(slug, name_ja) => {
                setCategorySlug(slug);
                setCategoryNameJa(name_ja);
              }}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">タイトル（必須）</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                const v = e.target.value;
                setTitle(v.length > REVIEW_TITLE_MAX ? v.slice(0, REVIEW_TITLE_MAX) : v);
              }}
              placeholder="例: 初の真空管プリアンプ"
              maxLength={REVIEW_TITLE_MAX}
              required
            />
            <p className="text-xs text-gray-500 tabular-nums">
              {title.length} / {REVIEW_TITLE_MAX} 文字
            </p>
          </div>

          {!isContentOnlyCategory && (
            <>
              <div className="space-y-2">
                <Label htmlFor="gear">機材名（必須）</Label>
                <Input
                  id="gear"
                  value={gearName}
                  onChange={(e) => setGearName(e.target.value)}
                  placeholder="例: UA 6176"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maker">メーカー・ブランド（任意）</Label>
                <Input
                  id="maker"
                  list="maker-list"
                  value={makerName}
                  onChange={(e) => setMakerName(e.target.value)}
                  placeholder="例: Fender, BlackSmoker"
                  className="flex h-10 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-electric-blue"
                />
                <datalist id="maker-list">
                  {makers.map((m) => (
                    <option key={m.id} value={m.name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label>評価（5段階）</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i)}
                      className={`text-2xl transition-opacity ${
                        i <= rating ? "text-electric-blue opacity-100" : "text-gray-500 opacity-50"
                      }`}
                      aria-label={`${i}点`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addToOwnedGear}
                    onChange={(e) => setAddToOwnedGear(e.target.checked)}
                    className="rounded border-surface-border bg-surface-card text-electric-blue focus:ring-electric-blue"
                  />
                  <span className="text-sm text-gray-200">
                    マイページの所持機材にこの機材を追加する
                  </span>
                </label>
                <p className="text-xs text-gray-500">
                  チェックを入れると、投稿後にプロフィールの「所有機材」に自動で追加されます。
                </p>
              </div>
            </>
          )}

          <BodyTextareaWithAi
            id="body"
            value={bodyMd}
            onChange={setBodyMd}
            placeholder="使い心地や音の特徴などを書いてください"
            rows={8}
            disabled={submitting}
            maxLength={REVIEW_BODY_MAX}
            required
          />
          <p className="text-xs text-gray-500 tabular-nums">
            {bodyMd.length.toLocaleString()} / {REVIEW_BODY_MAX.toLocaleString()} 文字
          </p>

          <div className="space-y-2">
            <Label>使用シチュエーション（任意・複数選択可）</Label>
            <div className="flex flex-wrap gap-2">
              {SITUATION_OPTIONS.map((opt) => {
                const checked = situations.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setSituations((prev) =>
                        prev.includes(opt.id) ? prev.filter((v) => v !== opt.id) : [...prev, opt.id],
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      checked
                        ? "border-electric-blue bg-electric-blue/20 text-electric-blue"
                        : "border-surface-border text-gray-300 hover:border-electric-blue/60 hover:text-electric-blue"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {categorySlug === "event" && (
            <div className="space-y-2">
              <Label htmlFor="eventUrl">イベントURL（任意）</Label>
              <Input
                id="eventUrl"
                type="url"
                value={eventUrl}
                onChange={(e) => setEventUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-gray-500">
                イベントの公式ページやチケット販売ページなどのURLを載せられます。記事ページにリンクとして表示されます。
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="youtubeUrl">YouTube URL（任意・埋め込み表示）</Label>
            <Input
              id="youtubeUrl"
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... または https://youtu.be/..."
            />
            <p className="text-xs text-gray-500">
              公開されている YouTube 動画の URL を貼ると、記事ページに動画が埋め込み表示されます。
            </p>
          </div>

          <div className="space-y-2">
            <Label>画像（任意・複数可）</Label>
            <p className="text-xs text-gray-500">一番上が一覧で使われるメイン画像です。複数回選択で追加できます。</p>
            {files.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {files.map((file, idx) => (
                  <li
                    key={`${file.name}-${idx}`}
                    className="relative flex flex-col items-center gap-1 rounded-lg border border-surface-border bg-surface-card p-1"
                  >
                    <span className="text-xs text-gray-400">{(idx + 1)}枚目</span>
                    <div className="relative w-20 h-20 rounded overflow-hidden bg-surface">
                      {filePreviewUrls[idx] && (
                        <img
                          src={filePreviewUrls[idx]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-gray-400 hover:text-red-400"
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="この画像を削除"
                    >
                      削除
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(e) => {
                const newFiles = Array.from(e.target.files ?? []);
                if (newFiles.length > 0) {
                  setFiles((prev) => [...prev, ...newFiles]);
                }
                e.target.value = "";
              }}
              className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-electric-blue file:px-4 file:py-2 file:text-surface-dark"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 mt-2">
            <input
              type="checkbox"
              checked={shareToXAfterSubmit}
              onChange={(e) => setShareToXAfterSubmit(e.target.checked)}
              className="rounded border-surface-border bg-surface-card text-electric-blue focus:ring-electric-blue"
            />
            <span>投稿後にXでシェアする（Xの投稿画面を開く）</span>
          </label>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "投稿中..." : "投稿する"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const urls = files.map((f) => URL.createObjectURL(f));
                setPreviewImageUrls(urls);
                setShowPreview(true);
              }}
              disabled={submitting}
            >
              プレビュー
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/">キャンセル</Link>
            </Button>
          </div>
        </Card>
      </form>

      {showPreview && (
        <ReviewFormPreview
          data={{
            title,
            categoryNameJa,
            gearName,
            makerName,
            rating,
            bodyMd,
            situations,
            youtubeUrl,
            newImageUrls: previewImageUrls,
            isContentOnlyCategory,
          }}
          onClose={() => {
            previewImageUrls.forEach((u) => URL.revokeObjectURL(u));
            setPreviewImageUrls([]);
            setShowPreview(false);
          }}
        />
      )}
    </div>
  );
}
