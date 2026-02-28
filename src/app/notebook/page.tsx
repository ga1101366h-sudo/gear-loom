"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";
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
import type { GearNotebookEntry, Review } from "@/types/database";

export default function NotebookPage() {
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseFirestore();

  const [entries, setEntries] = useState<GearNotebookEntry[]>([]);
  const [gearOptions, setGearOptions] = useState<string[]>([]);
  const [gearName, setGearName] = useState("");
  const [makerName, setMakerName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!db) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        if (user) {
          const snap = await getDocs(
            query(collection(db, "gear_notebook_entries"), where("user_id", "==", user.uid)),
          );
          const list: GearNotebookEntry[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              user_id: data.user_id ?? "",
              gear_name: data.gear_name ?? "",
              maker_name: (data.maker_name as string | null) ?? null,
              title: data.title ?? "",
              description: (data.description as string | null) ?? null,
              created_at: data.created_at ?? "",
              updated_at: data.updated_at ?? "",
            };
          }).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
          setEntries(list);

          const reviewsSnap = await getDocs(
            query(collection(db, "reviews"), where("author_id", "==", user.uid)),
          );
          const gearSet = new Set<string>();
          reviewsSnap.docs.forEach((d) => {
            const data = d.data() as Review;
            if (data.gear_name) gearSet.add(data.gear_name);
          });
          setGearOptions(Array.from(gearSet));
        }
      } catch (e) {
        console.error(e);
        setError("カスタム手帳の読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, db]);

  const entriesByGear = useMemo(() => {
    const map = new Map<string, GearNotebookEntry[]>();
    for (const e of entries) {
      const key = e.gear_name || "未設定";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [entries]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !db) return;
    if (!gearName.trim() || !title.trim()) {
      setError("対象機材名とカスタム内容のタイトルを入力してください。");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const ref = await addDoc(collection(db, "gear_notebook_entries"), {
        user_id: user.uid,
        gear_name: gearName.trim(),
        maker_name: makerName.trim() || null,
        title: title.trim(),
        description: description.trim() || null,
        created_at: now,
        updated_at: now,
      });
      const snap = await getDoc(doc(db, "gear_notebook_entries", ref.id));
      const data = snap.data();
      if (data) {
        const entry: GearNotebookEntry = {
          id: snap.id,
          user_id: data.user_id ?? user.uid,
          gear_name: data.gear_name ?? gearName.trim(),
          maker_name: (data.maker_name as string | null) ?? null,
          title: data.title ?? title.trim(),
          description: (data.description as string | null) ?? null,
          created_at: data.created_at ?? now,
          updated_at: data.updated_at ?? now,
        };
        setEntries((prev) => [entry, ...prev]);
      }
      setTitle("");
      setDescription("");
      if (!gearOptions.includes(gearName.trim())) {
        setGearOptions((prev) => [...prev, gearName.trim()]);
      }
    } catch (err) {
      console.error(err);
      setError("カスタムの記録に失敗しました。");
    } finally {
      setSubmitting(false);
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
            自分が使っている機材ごとに、行ったカスタムや調整内容を時系列でメモしておけます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="gearName">対象機材名</Label>
              <Input
                id="gearName"
                list="gear-name-options"
                value={gearName}
                onChange={(e) => setGearName(e.target.value)}
                placeholder="例: CROSSAMP VINTAGE"
              />
              <datalist id="gear-name-options">
                {gearOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
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
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? "記録中..." : "カスタムを記録する"}
              </Button>
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
              <ul className="space-y-3">
                {list.map((e) => (
                  <li key={e.id} className="border-b border-surface-border/60 pb-3 last:border-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-medium text-gray-100">{e.title}</p>
                      <span className="text-[11px] text-gray-500">
                        {e.created_at
                          ? new Date(e.created_at).toLocaleDateString("ja-JP")
                          : ""}
                      </span>
                    </div>
                    {e.maker_name && (
                      <p className="text-xs text-gray-400 mb-1">メーカー: {e.maker_name}</p>
                    )}
                    {e.description && (
                      <p className="text-xs text-gray-300 whitespace-pre-wrap">{e.description}</p>
                    )}
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
