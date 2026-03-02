"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase/client";
import { isAdminUserId } from "@/lib/admin";
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

function LoginPageContent() {
  const searchParams = useSearchParams();
  const modeSignUp = searchParams.get("mode") === "signup";
  const [isSignUp, setIsSignUp] = useState(modeSignUp);
  const { loading: authLoading, signIn, signUp, sendPasswordReset, signInWithGoogle, signInWithX } = useAuth();
  const auth = getFirebaseAuth();

  useEffect(() => {
    if (modeSignUp) setIsSignUp(true);
  }, [modeSignUp]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const db = getFirebaseFirestore();

  const USER_ID_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

  async function checkUserIdAvailable(value: string): Promise<{ available: boolean; error?: string }> {
    const normalized = value.trim().toLowerCase();
    if (!USER_ID_REGEX.test(normalized)) {
      return { available: false, error: "ユーザーIDは3〜30文字の半角英数字・アンダースコアのみ使用できます。" };
    }
    try {
      const res = await fetch(`/api/check-user-id?user_id=${encodeURIComponent(normalized)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { available: false, error: json.error ?? "ユーザーIDの確認に失敗しました。" };
      return { available: json.available === true, error: json.error };
    } catch {
      return { available: false, error: "接続できません。ネットワークを確認して再度お試しください。" };
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      if (isSignUp) {
        const uid = userId.trim().toLowerCase();
        if (!USER_ID_REGEX.test(uid)) {
          setMessage({
            type: "error",
            text: "ユーザーIDは3〜30文字の半角英数字・アンダースコアのみ使用できます。",
          });
          setLoading(false);
          return;
        }
        const result = await checkUserIdAvailable(uid);
        if (!result.available) {
          setMessage({
            type: "error",
            text: result.error ?? "このユーザーIDはすでに使われています。",
          });
          setLoading(false);
          return;
        }
        await signUp(email, password, username.trim() || email.split("@")[0], uid);
        setMessage({
          type: "success",
          text: "アカウントを作成しました。マイページ編集へ移動します。",
        });
        window.location.href = "/profile";
        return;
      } else {
        await signIn(email, password);
        let nextPath = searchParams.get("next");
        let next = nextPath ? (nextPath.startsWith("/") ? nextPath : `/${nextPath}`) : "/";
        const uid = auth?.currentUser?.uid;
        if (uid && db) {
          const profileSnap = await getDoc(doc(db, "profiles", uid));
          const profile = profileSnap.data();
          const userIdSet = profile && profile.user_id != null && String(profile.user_id).trim() !== "";
          if (!userIdSet) {
            // 初回ログイン時（プロフィール未作成 or user_id 未設定）はマイページ編集（プロフィール設定）へ
            window.location.href = "/profile";
            return;
          }
          if (isAdminUserId(profile?.user_id)) {
            next = "/admin";
          }
        }
        setMessage({ type: "success", text: "ログインしました。" });
        window.location.href = next;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "エラーが発生しました。";
      let friendlyMessage = msg;
      if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password") || msg.includes("auth/user-not-found")) {
        friendlyMessage = "メールアドレスまたはパスワードが違います。";
      } else if (msg.includes("auth/email-already-in-use")) {
        friendlyMessage = "このメールアドレスはすでに登録されています。ログインしてください。";
      } else if (msg.includes("auth/weak-password")) {
        friendlyMessage = "パスワードは6文字以上にしてください。";
      }
      setMessage({ type: "error", text: friendlyMessage });
      if (process.env.NODE_ENV === "development" && err instanceof Error) {
        console.error("[ログインエラー]", err.message, err);
      }
    } finally {
      setLoading(false);
    }
  }


  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setMessage(null);
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setMessage({
        type: "success",
        text: "パスワードリセット用のメールを送信しました。メール内のリンクから新しいパスワードを設定してください。",
      });
      setShowForgotPassword(false);
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "送信に失敗しました。",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setMessage(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      let next = searchParams.get("next") ?? "/";
      next = next.startsWith("/") ? next : `/${next}`;
      const uid = auth?.currentUser?.uid;
      if (uid && db) {
        const profileSnap = await getDoc(doc(db, "profiles", uid));
        const profile = profileSnap.data();
        const userIdSet = profile && profile.user_id != null && String(profile.user_id).trim() !== "";
        if (!userIdSet) {
          next = "/profile";
        } else if (isAdminUserId(profile.user_id)) {
          next = "/admin";
        }
      }
      window.location.href = next;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Googleログインに失敗しました。";
      const friendlyMessage =
        msg.includes("auth/popup-closed-by-user") || msg.includes("popup-closed-by-user")
          ? "ログインがキャンセルされました。"
          : msg;
      setMessage({ type: "error", text: friendlyMessage });
    } finally {
      setLoading(false);
    }
  }

  async function handleXSignIn() {
    setMessage(null);
    setLoading(true);
    try {
      await signInWithX();
      let next = searchParams.get("next") ?? "/";
      next = next.startsWith("/") ? next : `/${next}`;
      const uid = auth?.currentUser?.uid;
      if (uid && db) {
        const profileSnap = await getDoc(doc(db, "profiles", uid));
        const profile = profileSnap.data();
        const userIdSet = profile && profile.user_id != null && String(profile.user_id).trim() !== "";
        if (!userIdSet) {
          next = "/profile";
        } else if (isAdminUserId(profile?.user_id)) {
          next = "/admin";
        }
      }
      window.location.href = next;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xログインに失敗しました。";
      let friendlyMessage = msg;
      if (msg.includes("auth/popup-closed-by-user") || msg.includes("popup-closed-by-user")) {
        friendlyMessage = "ログインがキャンセルされました。";
      } else if (msg.includes("auth/invalid-credential")) {
        friendlyMessage =
          "X認証の設定に問題があります。Firebase Console の「認証 → サインイン方法 → X」で API Key / API Secret（X Developer の Consumer Key・Secret）が正しいか、X Developer の Callback URL が「https://あなたのプロジェクト.firebaseapp.com/__/auth/handler」になっているか、開発中ならテストユーザーに追加されているか確認してください。";
      }
      setMessage({ type: "error", text: friendlyMessage });
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
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
          <CardTitle className="text-electric-blue">
            {isSignUp ? "アカウント作成" : "ログイン"}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? "メールアドレス・パスワード・ユーザー名・ユーザーID（@で表示）で登録"
              : "Gear-Loom にログインしてレビューを投稿"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">ユーザー名（表示名）</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="例: たろう"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userId">ユーザーID（@から始まる一意のID）</Label>
                  <div className="flex items-center rounded-lg border border-surface-border bg-surface-card overflow-hidden">
                    <span className="px-3 text-gray-500 text-sm">@</span>
                    <Input
                      id="userId"
                      type="text"
                      placeholder="例: taro_gear"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                      required={isSignUp}
                      minLength={3}
                      maxLength={30}
                      className="border-0 bg-transparent focus-visible:ring-0"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    3〜30文字の半角英数字・アンダースコアのみ。他のユーザーと被らないように設定してください。
                  </p>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!showForgotPassword}
                minLength={6}
              />
              {!isSignUp && (
                <p className="text-sm">
                  <button
                    type="button"
                    className="text-electric-blue hover:underline font-medium"
                    onClick={() => {
                      setShowForgotPassword(!showForgotPassword);
                      setMessage(null);
                    }}
                  >
                    パスワードを忘れた場合 →
                  </button>
                </p>
              )}
            </div>
            {showForgotPassword && !isSignUp && (
              <form onSubmit={handleForgotPassword} className="rounded-lg border border-surface-border bg-surface-card/50 p-3 space-y-2">
                <p className="text-sm text-gray-300">登録したメールアドレスを入力すると、パスワードリセット用のリンクを送信します。</p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="メールアドレス"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit" variant="secondary" size="sm" disabled={loading}>
                    送信
                  </Button>
                </div>
              </form>
            )}
            {message && (
              <p
                className={`text-sm ${
                  message.type === "success" ? "text-electric-blue" : "text-red-400"
                }`}
              >
                {message.text}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || showForgotPassword}
            >
              {loading ? "処理中..." : isSignUp ? "登録" : "ログイン"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-surface-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase text-gray-500">
              <span className="bg-surface-card px-2">または</span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            Google でログイン
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleXSignIn}
            disabled={loading}
          >
            X（Twitter）でログイン
          </Button>

          <p className="text-center text-sm text-gray-400">
            {isSignUp ? "すでにアカウントをお持ちですか？" : "アカウントをお持ちでないですか？"}{" "}
            <button
              type="button"
              className="text-electric-blue hover:underline"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage(null);
              }}
            >
              {isSignUp ? "ログイン" : "登録"}
            </button>
          </p>
        </CardContent>
      </Card>
      <p className="mt-6 text-center">
        <Link href="/" className="text-sm text-gray-400 hover:text-electric-blue">
          ← トップに戻る
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md py-12 text-center text-gray-400">
          読み込み中...
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
