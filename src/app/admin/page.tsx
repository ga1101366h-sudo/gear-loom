"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase/client";
import { isAdminUserId } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AdminUserItem = { id: string; display_name: string | null; user_id: string | null; created_at: string };
type IncompleteUserItem = { uid: string; email: string | null; display_name: string | null };
type AdminReviewItem = { id: string; title: string; author_id: string; created_at: string };

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [incompleteUsers, setIncompleteUsers] = useState<IncompleteUserItem[]>([]);
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingIncompleteUsers, setLoadingIncompleteUsers] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingIncompleteUserId, setDeletingIncompleteUserId] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid || !db) return;
    getDoc(doc(db, "profiles", user.uid)).then((snap) => {
      setProfileUserId((snap.data()?.user_id as string) ?? null);
    });
  }, [user?.uid, db]);

  const isAdmin = isAdminUserId(profileUserId);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?next=/admin");
      return;
    }
    if (profileUserId !== null && !isAdmin) {
      router.push("/");
      return;
    }
  }, [user, authLoading, isAdmin, profileUserId, router]);

  async function fetchUsers() {
    if (!auth?.currentUser) return;
    setLoadingUsers(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(json.users)) setUsers(json.users);
      else setUsers([]);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchIncompleteUsers() {
    if (!auth?.currentUser) return;
    setLoadingIncompleteUsers(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin/incomplete-users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(json.users)) setIncompleteUsers(json.users);
      else setIncompleteUsers([]);
    } catch {
      setIncompleteUsers([]);
    } finally {
      setLoadingIncompleteUsers(false);
    }
  }

  async function fetchReviews() {
    if (!auth?.currentUser) return;
    setLoadingReviews(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin/reviews", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(json.reviews)) setReviews(json.reviews);
      else setReviews([]);
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }

  useEffect(() => {
    if (!isAdmin || !user) return;
    fetchUsers();
    fetchIncompleteUsers();
    fetchReviews();
  }, [isAdmin, user?.uid]);

  async function handleDeleteUser(uid: string) {
    if (!auth?.currentUser || uid === user?.uid) return;
    if (!confirm("このユーザーを削除しますか？\nFirebase Auth のアカウントとプロフィールが削除されます。")) return;
    setDeletingUserId(uid);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== uid));
      } else {
        alert(json.error ?? "削除に失敗しました。");
      }
    } catch {
      alert("削除に失敗しました。");
    } finally {
      setDeletingUserId(null);
    }
  }

  async function handleDeleteIncompleteUser(uid: string) {
    if (!auth?.currentUser || uid === user?.uid) return;
    if (!confirm("このユーザー（ID未設定）を削除しますか？\nFirebase Auth のアカウントとプロフィールが削除されます。")) return;
    setDeletingIncompleteUserId(uid);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setIncompleteUsers((prev) => prev.filter((u) => u.uid !== uid));
      } else {
        alert(json.error ?? "削除に失敗しました。");
      }
    } catch {
      alert("削除に失敗しました。");
    } finally {
      setDeletingIncompleteUserId(null);
    }
  }

  async function handleDeleteReview(reviewId: string) {
    if (!auth?.currentUser) return;
    if (!confirm("この記事を削除しますか？")) return;
    setDeletingReviewId(reviewId);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin/delete-review", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reviewId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      } else {
        alert(json.error ?? "削除に失敗しました。");
      }
    } catch {
      alert("削除に失敗しました。");
    } finally {
      setDeletingReviewId(null);
    }
  }

  if (authLoading || (user && profileUserId === null)) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  if (!user) return null;
  if (!isAdmin) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-2xl font-bold text-white">管理者ページ</h1>
        <Button variant="outline" asChild>
          <Link href="/">トップへ</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">登録ユーザー一覧</CardTitle>
          <CardDescription>
            ユーザーを削除すると、Firebase Auth のアカウントとプロフィールが削除されます。自分自身は削除できません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <p className="text-gray-500 text-sm">読み込み中...</p>
          ) : users.length === 0 ? (
            <p className="text-gray-500 text-sm">ユーザーがいません。</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-4 py-2 border-b border-surface-border last:border-0"
                >
                  <span className="text-gray-300 truncate">
                    {u.display_name ?? "(未設定)"}
                    {u.user_id != null && (
                      <span className="text-gray-500 ml-1">@{u.user_id}</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-500 text-xs">{u.id.slice(0, 8)}…</span>
                    {u.id !== user.uid ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 border-red-400/50 hover:bg-red-400/10"
                        disabled={deletingUserId === u.id}
                        onClick={() => handleDeleteUser(u.id)}
                      >
                        {deletingUserId === u.id ? "削除中..." : "削除"}
                      </Button>
                    ) : (
                      <span className="text-gray-500 text-xs">（自分）</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">ID未設定のユーザー（未完了）</CardTitle>
          <CardDescription>
            X・Googleでログインしたがプロフィール（ユーザーID）を未設定のまま離脱したユーザーです。削除すると Firebase Auth のアカウントとプロフィールが削除されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingIncompleteUsers ? (
            <p className="text-gray-500 text-sm">読み込み中...</p>
          ) : incompleteUsers.length === 0 ? (
            <p className="text-gray-500 text-sm">該当ユーザーはいません。</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {incompleteUsers.map((u) => (
                <li
                  key={u.uid}
                  className="flex items-center justify-between gap-4 py-2 border-b border-surface-border last:border-0"
                >
                  <span className="text-gray-300 truncate">
                    {u.display_name ?? u.email ?? "(表示名なし)"}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-500 text-xs">{u.uid.slice(0, 8)}…</span>
                    {u.uid !== user?.uid ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 border-red-400/50 hover:bg-red-400/10"
                        disabled={deletingIncompleteUserId === u.uid}
                        onClick={() => handleDeleteIncompleteUser(u.uid)}
                      >
                        {deletingIncompleteUserId === u.uid ? "削除中..." : "削除"}
                      </Button>
                    ) : (
                      <span className="text-gray-500 text-xs">（自分）</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">記事一覧（レビュー）</CardTitle>
          <CardDescription>
            管理者は投稿者でなくても記事を削除できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReviews ? (
            <p className="text-gray-500 text-sm">読み込み中...</p>
          ) : reviews.length === 0 ? (
            <p className="text-gray-500 text-sm">記事がありません。</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-4 py-2 border-b border-surface-border last:border-0"
                >
                  <Link
                    href={`/reviews/${r.id}`}
                    className="text-gray-300 hover:text-electric-blue truncate flex-1 min-w-0"
                  >
                    {r.title || "(無題)"}
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-500 text-xs">{r.created_at?.slice(0, 10)}</span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/reviews/${r.id}/edit`}>編集</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-400/50 hover:bg-red-400/10"
                      disabled={deletingReviewId === r.id}
                      onClick={() => handleDeleteReview(r.id)}
                    >
                      {deletingReviewId === r.id ? "削除中..." : "削除"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
