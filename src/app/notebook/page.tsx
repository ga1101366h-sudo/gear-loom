"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore, getFirebaseStorage } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { GearNotebookEntry } from "@/types/database";

const ACCEPT_IMAGE = "image/jpeg,image/png,image/webp,image/gif";

function parseOwnedGearLines(ownedGear: string | null | undefined): string[] {
  if (!ownedGear || !ownedGear.trim()) return [];
  return ownedGear.trim().split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

export default function NotebookPage() {
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseFirestore();
  const storage = getFirebaseStorage();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<GearNotebookEntry[]>([]);
  const [ownedGearLines, setOwnedGearLines] = useState<string[]>([]);
  const [gearName, setGearName] = useState("");
  const [gearNameOther, setGearNameOther] = useState("");
  const [makerName, setMakerName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  type NotebookData = { entries: GearNotebookEntry[]; ownedGearLines: string[] };
  const { data: notebookData, isLoading: swrLoading, mutate: mutateNotebook } = useSWR<NotebookData>(
    user && db ? ["notebook", user.uid] : null,
    async (): Promise<NotebookData> => {
      const [entriesSnap, profileSnap] = await Promise.all([
        getDocs(
          query(collection(db!, "gear_notebook_entries"), where("user_id", "==", user!.uid)),
        ),
        getDoc(doc(db!, "profiles", user!.uid)),
      ]);
      const list: GearNotebookEntry[] = entriesSnap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            user_id: data.user_id ?? "",
            gear_name: data.gear_name ?? "",
            maker_name: (data.maker_name as string | null) ?? null,
            title: data.title ?? "",
            description: (data.description as string | null) ?? null,
            image_url: (data.image_url as string | null) ?? null,
            created_at: data.created_at ?? "",
            updated_at: data.updated_at ?? "",
          };
        })
        .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      const profileData = profileSnap.data();
      const ownedGear = (profileData?.owned_gear as string | null) ?? null;
      return { entries: list, ownedGearLines: parseOwnedGearLines(ownedGear) };
    },
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  useEffect(() => {
    if (notebookData) {
      setEntries(notebookData.entries);
      setOwnedGearLines(notebookData.ownedGearLines);
    }
  }, [notebookData]);

  const loading = authLoading || (user && db && swrLoading && !notebookData);

  const entriesByGear = useMemo(() => {
    const map = new Map<string, GearNotebookEntry[]>();
    for (const e of entries) {
      const key = e.gear_name || "未設定";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [entries]);

  const displayGearName =
    ownedGearLines.length === 0 ? gearNameOther.trim() : (gearName === "__other__" ? gearNameOther.trim() : gearName);

  function resetForm() {
    setGearName("");
    setGearNameOther("");
    setMakerName("");
    setTitle("");
    setDescription("");
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setEditingId(null);
    setError(null);
  }

  function startEdit(entry: GearNotebookEntry) {
    setEditingId(entry.id);
    setGearName(ownedGearLines.includes(entry.gear_name) ? entry.gear_name : "__other__");
    setGearNameOther(ownedGearLines.includes(entry.gear_name) ? "" : entry.gear_name);
    setMakerName(entry.maker_name ?? "");
    setTitle(entry.title);
    setDescription(entry.description ?? "");
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !db) return;
    const finalGearName = displayGearName;
    if (!finalGearName || !title.trim()) {
      setError("対象機材名とカスタム内容のタイトルを入力してください。");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      if (editingId) {
        const entryRef = doc(db, "gear_notebook_entries", editingId);
        let imageUrl: string | null = null;
        if (storage && imageFile) {
          const ext = imageFile.name.split(".").pop() ?? "jpg";
          const storagePath = `notebook-images/${user.uid}/${editingId}/${Date.now()}.${ext}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, imageFile, {
            cacheControl: "public, max-age=31536000, immutable",
            contentType: imageFile.type || undefined,
          });
          imageUrl = await getDownloadURL(storageRef);
        }
        const payload: Record<string, unknown> = {
          gear_name: finalGearName,
          maker_name: makerName.trim() || null,
          title: title.trim(),
          description: description.trim() || null,
          updated_at: now,
        };
        if (imageUrl !== null) payload.image_url = imageUrl;
        await updateDoc(entryRef, payload);
        setEntries((prev) =>
          prev.map((e) =>
            e.id === editingId
              ? {
                  ...e,
                  gear_name: finalGearName,
                  maker_name: makerName.trim() || null,
                  title: title.trim(),
                  description: description.trim() || null,
                  image_url: imageUrl ?? e.image_url,
                  updated_at: now,
                }
              : e
          )
        );
        mutateNotebook();
        resetForm();
      } else {
        const docRef = await addDoc(collection(db, "gear_notebook_entries"), {
          user_id: user.uid,
          gear_name: finalGearName,
          maker_name: makerName.trim() || null,
          title: title.trim(),
          description: description.trim() || null,
          image_url: null,
          created_at: now,
          updated_at: now,
        });
        let imageUrl: string | null = null;
        if (storage && imageFile) {
          try {
            const ext = imageFile.name.split(".").pop() ?? "jpg";
            const storagePath = `notebook-images/${user.uid}/${docRef.id}/${Date.now()}.${ext}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, imageFile, {
              cacheControl: "public, max-age=31536000, immutable",
              contentType: imageFile.type || undefined,
            });
            imageUrl = await getDownloadURL(storageRef);
            const updatePayload = { image_url: imageUrl, updated_at: new Date().toISOString() };
            try {
              await updateDoc(docRef, updatePayload);
            } catch (updateErr: unknown) {
              const code = updateErr && typeof updateErr === "object" && "code" in updateErr ? (updateErr as { code?: string }).code : "";
              if (String(code) === "permission-denied") {
                await new Promise((r) => setTimeout(r, 400));
                await updateDoc(docRef, updatePayload);
              } else {
                throw updateErr;
              }
            }
          } catch (storageErr: unknown) {
            console.error(storageErr);
            const code = storageErr && typeof storageErr === "object" && "code" in storageErr ? (storageErr as { code?: string }).code : "";
            setError(
              String(code).startsWith("storage/")
                ? "記録は保存しましたが、画像のアップロードで権限エラーです。Firebase Console → Storage → ルールで notebook-images の書き込みを許可し「公開」してください。"
                : "記録は保存しましたが、画像のアップロードに失敗しました。"
            );
          }
        }
        const snap = await getDoc(doc(db, "gear_notebook_entries", docRef.id));
        const data = snap.data();
        if (data) {
          const entry: GearNotebookEntry = {
            id: snap.id,
            user_id: data.user_id ?? user.uid,
            gear_name: data.gear_name ?? finalGearName,
            maker_name: (data.maker_name as string | null) ?? null,
            title: data.title ?? title.trim(),
            description: (data.description as string | null) ?? null,
            image_url: (data.image_url as string | null) ?? imageUrl ?? null,
            created_at: data.created_at ?? now,
            updated_at: data.updated_at ?? now,
          };
          setEntries((prev) => [entry, ...prev]);
        }
        mutateNotebook();
        resetForm();
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : "";
      if (String(msg).startsWith("storage/")) {
        setError("画像のアップロードで権限エラーです。Firebase Console → Storage → ルールで notebook-images の書き込みを許可し「公開」してください。");
      } else {
        setError(editingId ? "更新に失敗しました。（Firestore の権限を確認してください）" : "カスタムの記録に失敗しました。（Firestore の権限を確認してください）");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(entryId: string) {
    if (!db || !user) return;
    if (!confirm("このカスタム記録を削除しますか？")) return;
    setDeletingId(entryId);
    try {
      const storage = getFirebaseStorage();
      if (storage) {
        const listRef = ref(storage, `notebook-images/${user.uid}/${entryId}`);
        const { items } = await listAll(listRef);
        await Promise.all(items.map((itemRef) => deleteObject(itemRef)));
      }
      await deleteDoc(doc(db, "gear_notebook_entries", entryId));
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      mutateNotebook();
    } catch (err) {
      console.error(err);
      setError("削除に失敗しました。");
    } finally {
      setDeletingId(null);
    }
  }

  if (authLoading || (loading && !user)) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-4 text-center text-gray-400">
        <p>カスタム手帳を使うにはログインが必要です。</p>
        <Button asChild>
          <Link href="/login?next=/notebook">ログインしてカスタムを記録する</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">カスタム手帳</CardTitle>
          <CardDescription>
            自分が使っている機材ごとに、行ったカスタムや調整内容を時系列でメモしておけます。対象機材はマイページで登録した所有機材から選べます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="gearName">対象機材名</Label>
              {ownedGearLines.length > 0 ? (
                <>
                  <select
                    id="gearName"
                    value={gearName}
                    onChange={(e) => setGearName(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100 focus:ring-2 focus:ring-electric-blue"
                  >
                    <option value="">選択してください</option>
                    {ownedGearLines.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    <option value="__other__">その他（下記に入力）</option>
                  </select>
                  {gearName === "__other__" && (
                    <Input
                      value={gearNameOther}
                      onChange={(e) => setGearNameOther(e.target.value)}
                      placeholder="機材名を入力"
                      className="mt-1"
                    />
                  )}
                  <p className="text-xs text-gray-500">
                    マイページの「所有機材」に登録した機材から選択できます。<Link href="/profile" className="text-electric-blue hover:underline">プロフィール編集</Link>で追加・変更できます。
                  </p>
                </>
              ) : (
                <>
                  <Input
                    id="gearName"
                    value={gearNameOther}
                    onChange={(e) => setGearNameOther(e.target.value)}
                    placeholder="例: CROSSAMP VINTAGE"
                  />
                  <p className="text-xs text-gray-500">
                    マイページの「所有機材」に登録するとここで選択できます。<Link href="/profile" className="text-electric-blue hover:underline">プロフィール編集</Link>で登録できます。
                  </p>
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="makerName">メーカー・ブランド（任意）</Label>
              <Input
                id="makerName"
                value={makerName}
                onChange={(e) => setMakerName(e.target.value)}
                placeholder="例: A.S.P.GEAR"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">カスタム内容（タイトル）</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: ピックアップを○○に交換"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">詳細メモ（任意）</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="作業内容・使用したパーツ・音の変化などを自由に記録"
                className="flex w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-electric-blue"
              />
            </div>
            <div className="space-y-2">
              <Label>画像（任意）</Label>
              <input
                ref={imageInputRef}
                type="file"
                accept={ACCEPT_IMAGE}
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-400 file:mr-3 file:rounded file:border-0 file:bg-electric-blue/20 file:px-3 file:py-1.5 file:text-electric-blue"
              />
              {editingId && (
                <p className="text-xs text-gray-500">新しいファイルを選ぶと既存の画像を置き換えます。</p>
              )}
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? (editingId ? "更新中..." : "記録中...") : editingId ? "更新する" : "カスタムを記録する"}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={resetForm} disabled={submitting}>
                  キャンセル
                </Button>
              )}
              <Button variant="ghost" asChild>
                <Link href="/">トップに戻る</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {entriesByGear.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-400">
            まだカスタム手帳に記録がありません。上のフォームから最初のカスタムを記録してみてください。
          </CardContent>
        </Card>
      ) : (
        entriesByGear.map(([gear, list]) => (
          <Card key={gear}>
            <CardHeader>
              <CardTitle className="text-white text-lg">{gear}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {list.map((e) => (
                  <li key={e.id} className="border-b border-surface-border/60 pb-4 last:border-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-gray-100">{e.title}</p>
                      <span className="text-[11px] text-gray-500 shrink-0">
                        {e.created_at ? new Date(e.created_at).toLocaleDateString("ja-JP") : ""}
                      </span>
                    </div>
                    {e.maker_name && (
                      <p className="text-xs text-gray-400 mb-1">メーカー: {e.maker_name}</p>
                    )}
                    {e.image_url && (
                      <div className="my-2 relative w-full max-w-xs aspect-video rounded-lg overflow-hidden bg-surface-card">
                        <Image
                          src={e.image_url}
                          alt=""
                          fill
                          className="object-contain"
                          sizes="320px"
                          unoptimized
                        />
                      </div>
                    )}
                    {e.description && (
                      <p className="text-xs text-gray-300 whitespace-pre-wrap">{e.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(e)}
                        disabled={!!editingId || !!deletingId}
                      >
                        編集
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleDelete(e.id)}
                        disabled={!!editingId || deletingId === e.id}
                      >
                        {deletingId === e.id ? "削除中..." : "削除"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
