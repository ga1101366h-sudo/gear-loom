"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const USER_ID_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const { user, signOut, loading: authLoading } = useAuth();
  const db = getFirebaseFirestore();
  const [displayName, setDisplayName] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/onboarding?next=${next}`)}`);
      return;
    }
    if (!db) {
      setLoading(false);
      return;
    }
    (async () => {
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      const profile = profileSnap.data();
      if (profile?.user_id) {
        router.replace(next.startsWith("/") ? next : `/${next}`);
        return;
      }
      setDisplayName(profile?.display_name ?? "");
      setLoading(false);
    })();
  }, [user, authLoading, db, router, next]);

  async function checkUserIdAvailable(value: string): Promise<boolean> {
    const normalized = value.trim().toLowerCase();
    if (!USER_ID_REGEX.test(normalized)) return false;
    const res = await fetch(`/api/check-user-id?user_id=${encodeURIComponent(normalized)}`);
    const json = await res.json();
    return json.available === true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !db) return;
    const uid = userId.trim().toLowerCase();
    if (!USER_ID_REGEX.test(uid)) {
      setMessage({
        type: "error",
        text: "ユーザーIDは3〜30文字の半角英数字・アンダースコアのみ使用できます。",
      });
      return;
    }
    const available = await checkUserIdAvailable(uid);
    if (!available) {
      setMessage({ type: "error", text: "このユーザーIDはすでに使われています。" });
      return;
    }
    setMessage(null);
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await setDoc(
        doc(db, "profiles", user.uid),
        {
          display_name: displayName.trim() || user.displayName || user.email?.split("@")[0] || null,
          user_id: uid,
          avatar_url: user.photoURL ?? null,
          created_at: now,
          updated_at: now,
        },
        { merge: true }
      );
      // 初回設定後は next があればそこへ、なければプロフィールへ
      const target = next.startsWith("/") ? next : `/${next}`;
      router.replace(target || "/profile");
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "保存に失敗しました。",
      });
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-md py-12 text-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-electric-blue">プロフィールを設定</CardTitle>
          <CardDescription>
            表示名とユーザーID（@で表示される一意のID）を設定してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">ユーザー名（表示名）</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="例: たろう"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userId">ユーザーID</Label>
              <div className="flex items-center rounded-lg border border-surface-border bg-surface-card overflow-hidden">
                <span className="px-3 text-gray-500 text-sm">@</span>
                <Input
                  id="userId"
                  type="text"
                  placeholder="例: taro_gear"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  required
                  minLength={3}
                  maxLength={30}
                  className="border-0 bg-transparent focus-visible:ring-0"
                />
              </div>
              <p className="text-xs text-gray-500">
                3〜30文字の半角英数字・アンダースコアのみ。他のユーザーと被らないように設定してください。
              </p>
            </div>
            {message && (
              <p
                className={`text-sm ${
                  message.type === "success" ? "text-electric-blue" : "text-red-400"
                }`}
              >
                {message.text}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "保存中..." : "設定して続ける"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-6 text-center">
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push("/");
          }}
          className="text-sm text-gray-400 hover:text-electric-blue"
        >
          ← トップに戻る
        </button>
      </p>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md py-12 text-center text-gray-400">
          読み込み中...
        </div>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  );
}
