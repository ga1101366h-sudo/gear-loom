"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import Image from "next/image";
import { ref, uploadBytes } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore, getFirebaseStorage } from "@/lib/firebase/client";
import { getFirebaseStorageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryCascadeSelect } from "@/components/category-cascade-select";
import { ReviewFormPreview } from "@/components/review-form-preview";
import { BodyTextareaWithAi } from "@/components/body-textarea-with-ai";
import { isAdminUserId } from "@/lib/admin";
import {
  useReviewFormFields,
  SITUATION_OPTIONS,
} from "@/hooks/use-review-form-fields";

const REVIEW_TITLE_MAX = 100;
const REVIEW_BODY_MAX = 10000;
import type { Maker, SpecTag, ReviewImage } from "@/types/database";

export default function EditReviewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const reviewId = params.id;
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseFirestore();
  const storage = getFirebaseStorage();

  const [existingImages, setExistingImages] = useState<ReviewImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  /** 管理者が他ユーザーの記事を編集している場合 true（更新を API 経由で行う） */
  const [isAdminEditingOthers, setIsAdminEditingOthers] = useState(false);

  // ── 共通フォームフィールド（new/edit で共有） ──
  const {
    title, setTitle,
    gearName, setGearName,
    categorySlug, setCategorySlug,
    categoryNameJa, setCategoryNameJa,
    makerName, setMakerName,
    rating, setRating,
    bodyMd, setBodyMd,
    specTagIds,
    youtubeUrl, setYoutubeUrl,
    eventUrl, setEventUrl,
    situations, setSituations,
    showPreview, setShowPreview,
    previewImageUrls, setPreviewImageUrls,
    addToOwnedGear, setAddToOwnedGear,
    makers, setMakers,
    specTags, setSpecTags,
    groupSlug,
    isContentOnlyCategory,
    toggleSpecTag,
    setAllFields,
  } = useReviewFormFields({ db, initial: { addToOwnedGear: false } });

  useEffect(() => {
    if (authLoading) return;
    if (!reviewId) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/reviews/${reviewId}/edit`)}`);
      return;
    }
    if (!db) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [tagSnap, reviewSnap, profileSnap] = await Promise.all([
          getDocs(collection(db, "spec_tags")),
          getDoc(doc(db, "reviews", reviewId)),
          getDoc(doc(db, "profiles", user.uid)),
        ]);
        if (!reviewSnap.exists()) {
          router.push("/reviews");
          return;
        }
        const data = reviewSnap.data();
        const uid = (profileSnap.data()?.user_id as string) ?? null;
        setProfileUserId(uid);
        const userIdSet = uid != null && String(uid).trim() !== "";
        if (!userIdSet) {
          setLoading(false);
          router.push(`/profile?next=${encodeURIComponent(`/reviews/${reviewId}/edit`)}`);
          return;
        }
        const canEdit = data.author_id === user.uid || isAdminUserId(uid);
        if (!canEdit) {
          router.push(`/reviews/${reviewId}`);
          return;
        }
        setIsAdminEditingOthers(isAdminUserId(uid) && data.author_id !== user.uid);

        const tags: SpecTag[] = tagSnap.docs.map((d) => {
          const t = d.data();
          return {
            id: d.id,
            slug: t.slug ?? "",
            name_ja: t.name_ja ?? "",
            created_at: t.created_at ?? "",
          } as SpecTag;
        });
        setSpecTags(tags);

        setAllFields({
          title: (data.title as string) ?? "",
          categorySlug: (data.category_slug as string) ?? "",
          categoryNameJa: (data.category_name_ja as string) ?? "",
          gearName: (data.gear_name as string) ?? "",
          makerName: (data.maker_name as string) ?? "",
          rating: typeof data.rating === "number" ? data.rating : 5,
          bodyMd: (data.body_md as string) ?? "",
          specTagIds: ((data.spec_tag_ids as string[]) ?? []).slice(),
          youtubeUrl: (data.youtube_url as string) ?? "",
          eventUrl: (data.event_url as string) ?? "",
          situations: ((data.situations as string[]) ?? []).slice(),
        });
        const imgs = ((data.review_images as ReviewImage[]) ?? []).slice();
        imgs.sort((a, b) => a.sort_order - b.sort_order);
        setExistingImages(imgs);
      } catch (err) {
        console.error(err);
        setError("レビューの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, db, reviewId, router]);

  function validateLengths(): boolean {
    if (title.length > REVIEW_TITLE_MAX || bodyMd.length > REVIEW_BODY_MAX) {
      setError(
        `タイトルは${REVIEW_TITLE_MAX}文字以内、本文は${REVIEW_BODY_MAX.toLocaleString()}文字以内で入力してください。`
      );
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !db) return;
    setError(null);
    if (!validateLengths()) return;
    if (!categorySlug || !categoryNameJa) {
      setError("カテゴリを選択してください。");
      return;
    }

    setSubmitting(true);
    try {
      const reviewRef = doc(db, "reviews", reviewId);
      const reviewSnap = await getDoc(reviewRef);
      const data = reviewSnap.data();
      const canEdit = data && (data.author_id === user.uid || isAdminUserId(profileUserId));
      if (!canEdit) {
        setError("このレビューを編集する権限がありません。");
        setSubmitting(false);
        return;
      }

      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      const profile = profileSnap.data();
      const authorDisplayName = isAdminEditingOthers
        ? (data.author_display_name as string) ?? ""
        : (profile?.display_name ?? user.email?.split("@")[0] ?? "");
      const authorUserId = isAdminEditingOthers
        ? (data.author_user_id as string) ?? null
        : (profile?.user_id ?? null);
      const authorAvatarUrl = isAdminEditingOthers
        ? (data.author_avatar_url as string) ?? null
        : (profile?.avatar_url ?? null);

      let makerId: string | null = (data.maker_id as string | null) ?? null;
      const name = makerName.trim();
      if (!isContentOnlyCategory && name && groupSlug) {
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
      } else if (isContentOnlyCategory) {
        makerId = null;
      }

      const specTagNames = specTagIds
        .map((id) => specTags.find((t) => t.id === id)?.name_ja)
        .filter(Boolean) as string[];

      const updatedImages: { storage_path: string; sort_order: number }[] =
        existingImages.map((img) => ({
          storage_path: img.storage_path,
          sort_order: img.sort_order,
        }));

      if (storage && files.length > 0) {
        let sortBase = updatedImages.length;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const ext = file.name.split(".").pop() ?? "jpg";
          const storagePath = `review-images/${reviewId}/${Date.now()}-${i}.${ext}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, file, {
            cacheControl: "public, max-age=31536000, immutable",
            contentType: file.type || undefined,
          });
          updatedImages.push({ storage_path: storagePath, sort_order: sortBase + i });
        }
      }

      if (isAdminEditingOthers) {
        const token = await user.getIdToken();
        const res = await fetch(`/api/admin/reviews/${reviewId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            category_id: categorySlug,
            ...(makerId && { maker_id: makerId }),
            maker_name: isContentOnlyCategory ? null : (makerName.trim() || null),
            category_name_ja: categoryNameJa,
            category_slug: categorySlug,
            author_display_name: authorDisplayName,
            author_user_id: authorUserId,
            author_avatar_url: authorAvatarUrl,
            title: title.trim(),
            gear_name: isContentOnlyCategory ? "" : gearName.trim(),
            rating: isContentOnlyCategory ? 0 : rating,
            body_md: bodyMd.trim() || null,
            youtube_url: youtubeUrl.trim() || null,
            event_url: categorySlug === "event" ? (eventUrl.trim() || null) : null,
            situations: situations.length > 0 ? situations : null,
            spec_tag_ids: specTagIds,
            spec_tag_names: specTagNames,
            review_images: updatedImages,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError((json.error as string) || "更新に失敗しました。");
          setSubmitting(false);
          return;
        }
      } else {
        await updateDoc(reviewRef, {
          category_id: categorySlug,
          ...(makerId && { maker_id: makerId }),
          maker_name: isContentOnlyCategory ? null : (makerName.trim() || null),
          category_name_ja: categoryNameJa,
          category_slug: categorySlug,
          author_display_name: authorDisplayName,
          author_user_id: authorUserId,
          author_avatar_url: authorAvatarUrl,
          title: title.trim(),
          gear_name: isContentOnlyCategory ? "" : gearName.trim(),
          rating: isContentOnlyCategory ? 0 : rating,
          body_md: bodyMd.trim() || null,
          body_html: null,
          youtube_url: youtubeUrl.trim() || null,
          event_url: categorySlug === "event" ? (eventUrl.trim() || null) : null,
          situations: situations.length > 0 ? situations : null,
          updated_at: new Date().toISOString(),
          spec_tag_ids: specTagIds,
          spec_tag_names: specTagNames,
          review_images: updatedImages,
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

      router.push(`/reviews/${reviewId}`);
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "更新に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  function removeExistingImage(storagePath: string) {
    setExistingImages((prev) => prev.filter((img) => img.storage_path !== storagePath));
  }

  async function handleDeleteArticle() {
    if (!user || !reviewId) return;
    if (!confirm("この記事を削除しますか？この操作は取り消せません。")) return;
    setDeleting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/reviews/${reviewId}/delete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.error as string) || "削除に失敗しました。");
        return;
      }
      router.push("/reviews");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("削除に失敗しました。");
    } finally {
      setDeleting(false);
    }
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
      <h1 className="text-2xl font-bold text-white mb-6">レビューを編集</h1>
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
                  チェックを入れて更新すると、プロフィールの「所有機材」に追加されます（既に含まれている場合は追加されません）。
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
            {existingImages.length > 0 && (
              <>
                <p className="text-xs text-gray-500">
                  既存の画像。×で削除（更新時に反映）。下から新しい画像を追加できます。
                </p>
                <div className="flex flex-wrap gap-3">
                  {existingImages.map((img) => (
                    <div
                      key={img.storage_path}
                      className="relative w-24 h-24 rounded-lg overflow-hidden border border-surface-border group"
                    >
                      <Image
                        src={getFirebaseStorageUrl(img.storage_path)}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(img.storage_path)}
                        className="absolute top-0.5 right-0.5 h-6 w-6 rounded-full bg-red-600 text-white text-sm leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        aria-label="この画像を削除"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-electric-blue file:px-4 file:py-2 file:text-surface-dark"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex flex-wrap gap-3 items-center">
            <Button type="submit" disabled={submitting}>
              {submitting ? "更新中..." : "更新する"}
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
              <Link href={`/reviews/${reviewId}`}>キャンセル</Link>
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteArticle}
              disabled={deleting || submitting}
            >
              {deleting ? "削除中..." : "記事を削除"}
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
            existingImagePaths: existingImages.map((img) => ({ storage_path: img.storage_path, sort_order: img.sort_order })),
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

