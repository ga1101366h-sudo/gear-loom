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
import { CategoryDropdown } from "@/components/category-dropdown";
import { ReviewFormPreview } from "@/components/review-form-preview";
import { getGroupSlugByCategorySlug, isContentOnlyCategorySlug } from "@/data/post-categories";
import type { Maker, SpecTag, ReviewImage } from "@/types/database";

export default function EditReviewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const reviewId = params.id;
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseFirestore();
  const storage = getFirebaseStorage();

  const [makers, setMakers] = useState<Maker[]>([]);
  const [specTags, setSpecTags] = useState<SpecTag[]>([]);
  const [existingImages, setExistingImages] = useState<ReviewImage[]>([]);
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
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [situations, setSituations] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([]);

  const SITUATION_OPTIONS: { id: string; label: string }[] = [
    { id: "home", label: "自宅・宅録" },
    { id: "studio", label: "スタジオ" },
    { id: "livehouse", label: "ライブハウス" },
    { id: "streaming", label: "配信" },
  ];

  const groupSlug = categorySlug ? getGroupSlugByCategorySlug(categorySlug) : "";
  const isContentOnlyCategory = categorySlug ? isContentOnlyCategorySlug(categorySlug) : false;

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
        const [tagSnap, reviewSnap] = await Promise.all([
          getDocs(collection(db, "spec_tags")),
          getDoc(doc(db, "reviews", reviewId)),
        ]);
        if (!reviewSnap.exists()) {
          router.push("/reviews");
          return;
        }
        const data = reviewSnap.data();
        if (data.author_id !== user.uid) {
          router.push(`/reviews/${reviewId}`);
          return;
        }

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

        setTitle(data.title ?? "");
        setCategorySlug((data.category_slug as string) ?? "");
        setCategoryNameJa((data.category_name_ja as string) ?? "");
        setGearName((data.gear_name as string) ?? "");
        setMakerName((data.maker_name as string) ?? "");
        setRating(typeof data.rating === "number" ? data.rating : 5);
        setBodyMd((data.body_md as string) ?? "");
        setSpecTagIds(((data.spec_tag_ids as string[]) ?? []).slice());
        setYoutubeUrl((data.youtube_url as string) ?? "");
        setSituations(((data.situations as string[]) ?? []).slice());
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !db) return;
    setError(null);
    if (!categorySlug || !categoryNameJa) {
      setError("カテゴリを選択してください。");
      return;
    }

    setSubmitting(true);
    try {
      const reviewRef = doc(db, "reviews", reviewId);
      const reviewSnap = await getDoc(reviewRef);
      const data = reviewSnap.data();
      if (!data || data.author_id !== user.uid) {
        setError("このレビューを編集する権限がありません。");
        setSubmitting(false);
        return;
      }

      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      const profile = profileSnap.data();
      const authorDisplayName = profile?.display_name ?? user.email?.split("@")[0] ?? "";
      const authorUserId = profile?.user_id ?? null;

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
          await uploadBytes(storageRef, file);
          updatedImages.push({ storage_path: storagePath, sort_order: sortBase + i });
        }
      }

      await updateDoc(reviewRef, {
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
        situations: situations.length > 0 ? situations : null,
        updated_at: new Date().toISOString(),
        spec_tag_ids: specTagIds,
        spec_tag_names: specTagNames,
        review_images: updatedImages,
      });

      router.push(`/reviews/${reviewId}`);
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "更新に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleSpecTag(id: string) {
    setSpecTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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
            <p className="text-xs text-gray-500">検索して選択できます</p>
            <CategoryDropdown
              id="category"
              value={categorySlug}
              onChange={(slug, name_ja) => {
                setCategorySlug(slug);
                setCategoryNameJa(name_ja);
              }}
              placeholder="カテゴリを検索・選択"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">タイトル（必須）</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 初の真空管プリアンプ"
              required
            />
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
                  placeholder="例: Fender, BlackSmoker … 一覧にない場合は入力するとトップのメーカー一覧に追加されます"
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
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="body">本文</Label>
            <textarea
              id="body"
              value={bodyMd}
              onChange={(e) => setBodyMd(e.target.value)}
              placeholder="使い心地や音の特徴などを書いてください"
              rows={8}
              className="flex w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-electric-blue"
            />
          </div>

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

