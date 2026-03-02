"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase/client";
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

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "認証の検証に失敗しました。もう一度お試しください。",
  state_expired: "認証の有効期限が切れました。もう一度お試しください。",
  token_failed: "X認証の処理に失敗しました。",
  no_token: "トークンの取得に失敗しました。",
  user_failed: "Xのユーザー情報の取得に失敗しました。",
  no_x_user: "Xのユーザー情報を取得できませんでした。",
  server: "サーバーエラーが発生しました。",
  user_id_taken: "このユーザーIDはすでに使われています。",
  invalid_user_id: "ユーザーIDが不正です。",
  missing_params: "認証パラメータが不足しています。",
  access_denied:
    "Xでアプリへのアクセスが許可されませんでした。X Developer Portal で Callback URL が本番・ローカルで一致しているか、アプリ権限（Read）とテストユーザー設定を確認してください。",
  consent_denied:
    "Xでアプリへのアクセスが許可されませんでした。Callback URL とアプリ設定を確認してください。",
};

function SignupXContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const sid = searchParams.get("sid") ?? "";
  const { user, signInWithX, loading: authLoading } = useAuth();
  const db = getFirebaseFirestore();
  const [displayName, setDisplayName] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [prefillRedirecting, setPrefillRedirecting] = useState(false);
  const prefillTriedRef = useRef(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      const text = ERROR_MESSAGES[error] ?? "X認証で問題が発生しました。もう一度お試しください。";
      setMessage({ type: "error", text });
    }
  }, [searchParams]);

  // sid あり: X の名前・ユーザー名でフォームを事前入力
  useEffect(() => {
    if (!sid || user) return;
    let cancelled = false;
    fetch(`/api/auth/x-prefill?sid=${encodeURIComponent(sid)}`)
      .then((res) => res.json())
      .then((data: { name?: string; username?: string; error?: string }) => {
        if (cancelled) return;
        if (data.error) {
          setMessage({ type: "error", text: data.error });
        } else {
          setDisplayName(String(data.name ?? "").trim());
          const un = String(data.username ?? "").replace(/[^a-zA-Z0-9_]/g, "");
          setUserId(un);
        }
      })
      .catch(() => {
        if (!cancelled) setMessage({ type: "error", text: "Xの情報を取得できませんでした。" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sid, user]);

  // 未ログイン・sid なし: 1回だけ X へリダイレクトを試行（プレフィル用）
  useEffect(() => {
    if (user || sid || authLoading || prefillTriedRef.current) return;
    prefillTriedRef.current = true;
    let cancelled = false;
    setPrefillRedirecting(true);
    fetch("/api/auth/x-auth-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefill: true, next: next || "/" }),
    })
      .then((res) => res.json())
      .then((data: { url?: string; error?: string }) => {
        if (cancelled) return;
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setPrefillRedirecting(false);
        setLoading(false);
        if (data.error) {
          setMessage({ type: "error", text: data.error });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPrefillRedirecting(false);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, sid, authLoading, next]);

  useEffect(() => {
    if (authLoading) return;
    if (!db) {
      if (!sid) setLoading(false);
      return;
    }
    if (!user) {
      if (!sid) setLoading(false);
      return;
    }
    (async () => {
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      const profile = profileSnap.data();
      if (profile?.user_id) {
        router.replace(next.startsWith("/") ? next : `/${next}`);
        return;
      }
      setDisplayName(profile?.display_name ?? user.displayName ?? user.email?.split("@")[0] ?? "");
      setLoading(false);
    })();
  }, [user, authLoading, db, router, next, sid]);

  async function checkUserIdAvailable(value: string): Promise<boolean> {
    const normalized = value.trim().toLowerCase();
    if (!USER_ID_REGEX.test(normalized)) return false;
    const res = await fetch(`/api/check-user-id?user_id=${encodeURIComponent(normalized)}`);
    const json = await res.json();
    return json.available === true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
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

    if (user) {
      // すでにログイン済み（従来フロー・プロフ未作成）→ プロフィールだけ作成して続行
      if (!db) return;
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
        const target = next.startsWith("/") ? next : `/${next}`;
        router.replace(target || "/");
      } catch (err: unknown) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "保存に失敗しました。",
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    // 未ログイン: sid ありなら complete-signup、なしなら X OAuth へリダイレクト
    setSaving(true);
    try {
      if (sid) {
        const res = await fetch("/api/auth/x-complete-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sid,
            displayName: displayName.trim(),
            userId: uid,
            next: next || "/",
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          completeUrl?: string;
          token?: string;
          next?: string;
          error?: string;
        };
        if (!res.ok) {
          setMessage({ type: "error", text: json.error ?? "登録に失敗しました。" });
          setSaving(false);
          return;
        }
        if (json.completeUrl) {
          window.location.href = json.completeUrl;
          return;
        }
        if (json.token) {
          const n = json.next ?? next;
          router.push(`/signup/x/complete?token=${encodeURIComponent(json.token)}&next=${encodeURIComponent(n)}`);
          return;
        }
      } else {
        const res = await fetch("/api/auth/x-auth-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName.trim(),
            userId: uid,
            next: next || "/",
          }),
        });
        const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok) {
          setMessage({ type: "error", text: json.error ?? "認証URLの取得に失敗しました。" });
          setSaving(false);
          return;
        }
        if (json.url) {
          window.location.href = json.url;
          return;
        }
        setMessage({ type: "error", text: "認証URLの取得に失敗しました。" });
      }
    } catch {
      setMessage({ type: "error", text: "通信に失敗しました。" });
    }
    setSaving(false);
  }

  if (
    authLoading ||
    (user && loading) ||
    (!user && !sid && (loading || prefillRedirecting)) ||
    (!user && sid && loading)
  ) {
    return (
      <div className="mx-auto max-w-md py-12 text-center text-gray-400">
        {prefillRedirecting ? "Xへ移動しています..." : "読み込み中..."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-electric-blue">Xでログイン</CardTitle>
          <CardDescription>
            {user
              ? "ユーザー名とユーザーIDを設定してアカウントを有効にします。"
              : "「Xの情報を取得して入力欄を埋める」を押すとXの名前とIDが自動入力されます。編集して「設定して続ける」を押してください。"}
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
                3〜30文字の半角英数字・アンダースコアのみ。
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
            {!user && !sid && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={saving || prefillRedirecting}
                onClick={async () => {
                  setMessage(null);
                  setPrefillRedirecting(true);
                  try {
                    const res = await fetch("/api/auth/x-auth-url", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ prefill: true, next: next || "/" }),
                    });
                    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
                    if (data.url) {
                      window.location.href = data.url;
                      return;
                    }
                    setMessage({ type: "error", text: data.error ?? "Xの認証URLを取得できませんでした。" });
                  } catch {
                    setMessage({ type: "error", text: "通信に失敗しました。" });
                  } finally {
                    setPrefillRedirecting(false);
                  }
                }}
              >
                {prefillRedirecting ? "Xへ移動しています..." : "Xの情報を取得して入力欄を埋める"}
              </Button>
            )}
            <Button type="submit" className="w-full" disabled={saving}>
              {user
                ? saving
                  ? "保存中..."
                  : "設定して続ける"
                : saving
                  ? "Xへ移動しています..."
                  : "設定して続ける"}
            </Button>
          </form>
          {!user && (
            <p className="mt-4 text-center text-sm text-gray-500">
              <button
                type="button"
                className="text-electric-blue hover:underline"
                onClick={async () => {
                  setMessage(null);
                  setSaving(true);
                  try {
                    await signInWithX();
                    const uid = getFirebaseAuth()?.currentUser?.uid;
                    if (uid && db) {
                      const profileSnap = await getDoc(doc(db, "profiles", uid));
                      const profile = profileSnap.data();
                      if (profile?.user_id) {
                        const target = next.startsWith("/") ? next : `/${next}`;
                        window.location.href = target || "/";
                        return;
                      }
                    }
                    setLoading(false);
                  } catch {
                    setMessage({ type: "error", text: "Xログインに失敗しました。" });
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
              >
                すでにアカウントをお持ちの方はこちら
              </button>
            </p>
          )}
        </CardContent>
      </Card>
      <p className="mt-6 text-center">
        <Link href="/login" className="text-sm text-gray-400 hover:text-electric-blue">
          ← ログインに戻る
        </Link>
      </p>
    </div>
  );
}

export default function SignupXPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md py-12 text-center text-gray-400">
          読み込み中...
        </div>
      }
    >
      <SignupXContent />
    </Suspense>
  );
}
