"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore, getFirebaseStorage } from "@/lib/firebase/client";
import { formatCategoryPath, getStoragePathFromDownloadUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryCascadeSelect } from "@/components/category-cascade-select";
import type { UserGearItem } from "@/types/gear";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const ACCEPT_IMAGE = "image/jpeg,image/png,image/webp,image/gif";

function GearRow({
  item,
  onDelete,
}: {
  item: UserGearItem;
  onDelete: () => void;
}) {
  const nameLine = item.manufacturer ? `${item.manufacturer} / ${item.name}` : item.name;
  return (
    <li className="mb-2">
      <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] bg-white/[0.02] border border-white/10 rounded-md">
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center rounded bg-white/10 px-2 py-0.5 text-[11px] text-gray-200 mb-1">
            {formatCategoryPath(item.category ?? "")}
          </span>
          <div className="text-sm text-gray-100 truncate">{nameLine}</div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-500 hover:text-red-500 transition-colors"
          aria-label="この機材を削除"
        >
          <Trash2 className="w-4 h-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}

export default function MypageGearEditPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseFirestore();
  const storage = getFirebaseStorage();
  const gearImagesInputRef = useRef<HTMLInputElement>(null);

  const [ownedGearImages, setOwnedGearImages] = useState<string[]>([]);
  const [userGears, setUserGears] = useState<UserGearItem[]>([]);
  const [userGearsLoading, setUserGearsLoading] = useState(false);
  const [gearSaving, setGearSaving] = useState(false);
  const [gearError, setGearError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [ownedGearCategory, setOwnedGearCategory] = useState("");
  const [ownedGearMakerInput, setOwnedGearMakerInput] = useState("");
  const [ownedGearNameInput, setOwnedGearNameInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?next=/mypage/gear");
      return;
    }
    if (!db) {
      setLoading(false);
      return;
    }
    (async () => {
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      const data = profileSnap.data();
      const images = (data?.owned_gear_images as string[] | null) ?? [];
      setOwnedGearImages(images);
      setLoading(false);
    })();
  }, [user, authLoading, db, router]);

  useEffect(() => {
    if (!user) {
      setUserGears([]);
      return;
    }
    let cancelled = false;
    setUserGearsLoading(true);
    user
      .getIdToken()
      .then((token) =>
        fetch("/api/user/gears", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      )
      .then(async (res) => {
        if (!res.ok || cancelled) return null;
        return res.json() as Promise<UserGearItem[]>;
      })
      .then((items) => {
        if (!cancelled && Array.isArray(items)) setUserGears(items);
      })
      .catch((err) => {
        if (!cancelled) console.error("[mypage/gear] GET /api/user/gears", err);
      })
      .finally(() => {
        if (!cancelled) setUserGearsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleOwnedGearImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user || !db || !storage) return;
    setMessage(null);
    setGearError(null);
    try {
      const urls: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const ext = file.name.split(".").pop() ?? "jpg";
        const storagePath = `owned-gear-images/${user.uid}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file, {
          cacheControl: "public, max-age=31536000, immutable",
          contentType: file.type || undefined,
        });
        const url = await getDownloadURL(storageRef);
        urls.push(url);
      }
      if (urls.length > 0) {
        const newList = [...ownedGearImages, ...urls];
        await updateDoc(doc(db, "profiles", user.uid), {
          owned_gear_images: newList,
          updated_at: new Date().toISOString(),
        });
        setOwnedGearImages(newList);
        setMessage({ type: "success", text: "所有機材画像を追加しました。" });
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "所有機材画像のアップロードに失敗しました。",
      });
    } finally {
      e.target.value = "";
    }
  }

  async function handleAddOwnedGearLine() {
    if (!user) return;
    if (!ownedGearCategory || !ownedGearNameInput.trim()) {
      setGearError("カテゴリと機材名を入力してください。");
      toast.error("カテゴリと機材名は必須です");
      return;
    }
    setGearError(null);
    setGearSaving(true);
    try {
      const token = await user.getIdToken(true);
      const res = await fetch("/api/user/gears", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: ownedGearNameInput.trim(),
          manufacturer: ownedGearMakerInput.trim() || null,
          category: ownedGearCategory.trim() || null,
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = (data as { error?: string }).error ?? "保存に失敗しました。";
        setGearError("所有機材への追加に失敗しました。");
        toast.error(message);
        return;
      }
      const item = (await res.json()) as UserGearItem;
      setUserGears((prev) => [...prev, item]);
      setOwnedGearNameInput("");
      router.refresh();
      toast.success("保存しました");
    } catch (err: unknown) {
      console.error(err);
      setGearError("所有機材への追加に失敗しました。");
      toast.error("所有機材への追加に失敗しました。");
    } finally {
      setGearSaving(false);
    }
  }

  async function handleDeleteUserGear(userGearId: string) {
    if (!user) return;
    setGearError(null);
    setGearSaving(true);
    try {
      const token = await user.getIdToken(true);
      const res = await fetch(`/api/user/gears/${userGearId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = (data as { error?: string }).error ?? "削除に失敗しました。";
        setGearError("所有機材の削除に失敗しました。");
        toast.error(message);
        return;
      }
      setUserGears((prev) => prev.filter((g) => g.userGearId !== userGearId));
      router.refresh();
      toast.success("削除しました");
    } catch (err: unknown) {
      console.error(err);
      setGearError("所有機材の削除に失敗しました。");
      toast.error("所有機材の削除に失敗しました。");
    } finally {
      setGearSaving(false);
    }
  }

  async function handleDeleteOwnedGearImage(url: string) {
    if (!user || !db) return;
    const newList = ownedGearImages.filter((u) => u !== url);
    setGearError(null);
    setGearSaving(true);
    try {
      const path = getStoragePathFromDownloadUrl(url);
      if (path && storage) {
        try {
          await deleteObject(ref(storage, path));
        } catch {
          // ignore
        }
      }
      await updateDoc(doc(db, "profiles", user.uid), {
        owned_gear_images: newList,
        updated_at: new Date().toISOString(),
      });
      setOwnedGearImages(newList);
    } catch (err: unknown) {
      console.error(err);
      setGearError("所有機材画像の削除に失敗しました。");
    } finally {
      setGearSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <h1 className="font-display text-2xl font-bold text-white">機材を編集</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">所有機材</CardTitle>
          <CardDescription>
            使用している機材を登録すると、機材レビューやカスタム手帳で引用できるようになります。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5 md:col-span-2 flex flex-col">
              <Label className="text-xs text-gray-300">カテゴリ（機材ジャンル・種類・詳細）</Label>
              <CategoryCascadeSelect
                value={ownedGearCategory}
                onChange={() => {}}
                onLabelPathChange={(path) => setOwnedGearCategory(path)}
                placeholderMain="機材ジャンルを選択..."
                placeholderSub="種類・用途を選択..."
                placeholderItem="詳細タイプを選択..."
                hintText="3段階で絞り込むと、レビューやカスタム手帳で引用しやすくなります。"
              />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <Label className="text-xs text-gray-300">メーカー（任意）</Label>
              <Input
                type="text"
                placeholder="例: Fender"
                value={ownedGearMakerInput}
                onChange={(e) => setOwnedGearMakerInput(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5 md:col-span-1 flex flex-col md:flex-row gap-2 items-stretch md:items-end">
              <div className="flex-1 min-w-0 space-y-1.5 flex flex-col">
                <Label className="text-xs text-gray-300">機材名</Label>
                <Input
                  type="text"
                  placeholder="例: Stratocaster"
                  value={ownedGearNameInput}
                  onChange={(e) => setOwnedGearNameInput(e.target.value)}
                  className="h-10"
                />
              </div>
              <Button
                type="button"
                onClick={handleAddOwnedGearLine}
                disabled={gearSaving}
                variant="outline"
                size="default"
                className="h-10 px-6 shrink-0"
              >
                {gearSaving ? "追加中..." : "追加"}
              </Button>
            </div>
          </div>
          {gearError && <p className="text-xs text-red-400">{gearError}</p>}

          {(userGearsLoading || userGears.length > 0) && (
            <div className="mt-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-subtle">
              {userGearsLoading ? (
                <p className="text-sm text-gray-400">機材を読み込み中...</p>
              ) : (
                <ul>
                  {userGears.map((item) => (
                    <GearRow
                      key={item.userGearId}
                      item={item}
                      onDelete={() => handleDeleteUserGear(item.userGearId)}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">所有機材の写真（任意・複数可）</CardTitle>
          <CardDescription>マイページの所有機材セクションに表示されます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ownedGearImages.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {ownedGearImages.map((url) => (
                <div
                  key={url}
                  className="relative w-24 h-24 rounded-md overflow-hidden border border-surface-border group"
                >
                  <Image src={url} alt="" fill className="object-cover" sizes="96px" unoptimized />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 min-w-0 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    onClick={() => handleDeleteOwnedGearImage(url)}
                    disabled={gearSaving}
                    aria-label="この画像を削除"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4">
            <input
              ref={gearImagesInputRef}
              type="file"
              accept={ACCEPT_IMAGE}
              multiple
              className="hidden"
              onChange={handleOwnedGearImagesChange}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => gearImagesInputRef.current?.click()}
              className="px-4 py-2 text-sm font-medium rounded-md bg-transparent border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 transition-colors"
            >
              所有機材の写真を追加
            </Button>
            <p className="text-xs text-gray-500">JPEG/PNG/WebP/GIF、1枚あたり3MB程度までを推奨</p>
          </div>
        </CardContent>
      </Card>

      {message && (
        <p
          className={`text-sm text-center ${
            message.type === "success" ? "text-electric-blue" : "text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/mypage">マイページに戻る</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/profile">プロフィールを編集</Link>
        </Button>
      </div>
    </div>
  );
}
