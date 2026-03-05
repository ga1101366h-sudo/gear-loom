"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
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
import type { AdminLiveEventItem } from "@/app/api/admin/live-events/route";
import type { AdminAnnouncementItem } from "@/app/api/admin/announcements/route";

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
  const [liveEvents, setLiveEvents] = useState<AdminLiveEventItem[]>([]);
  const [loadingLiveEvents, setLoadingLiveEvents] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<AdminLiveEventItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editEventDate, setEditEventDate] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editVenueUrl, setEditVenueUrl] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AdminAnnouncementItem[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [newAnnouncementDate, setNewAnnouncementDate] = useState("");
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState("");
  const [newAnnouncementBody, setNewAnnouncementBody] = useState("");
  const [newAnnouncementUrl, setNewAnnouncementUrl] = useState("");
  const [newAnnouncementImportant, setNewAnnouncementImportant] = useState(false);
  const [addingAnnouncement, setAddingAnnouncement] = useState(false);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null);

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

  async function fetchLiveEvents() {
    if (!auth?.currentUser) return;
    setLoadingLiveEvents(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin/live-events", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(json.events)) setLiveEvents(json.events);
      else setLiveEvents([]);
    } catch {
      setLiveEvents([]);
    } finally {
      setLoadingLiveEvents(false);
    }
  }

  async function fetchAnnouncements() {
    if (!auth?.currentUser) return;
    setLoadingAnnouncements(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin/announcements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(json.announcements)) setAnnouncements(json.announcements);
      else setAnnouncements([]);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  }

  useEffect(() => {
    if (!isAdmin || !user) return;
    fetchUsers();
    fetchIncompleteUsers();
    fetchReviews();
    fetchLiveEvents();
    fetchAnnouncements();
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

  function openEditEvent(ev: AdminLiveEventItem) {
    setEditingEvent(ev);
    setEditTitle(ev.title);
    setEditEventDate(ev.event_date);
    setEditVenue(ev.venue ?? "");
    setEditVenueUrl(ev.venue_url ?? "");
    setEditDescription(ev.description ?? "");
  }

  function closeEditEvent() {
    setEditingEvent(null);
    setEditTitle("");
    setEditEventDate("");
    setEditVenue("");
    setEditVenueUrl("");
    setEditDescription("");
  }

  async function handleSaveLiveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!auth?.currentUser || !editingEvent) return;
    if (!editTitle.trim() || !editEventDate) return;
    setSavingEventId(editingEvent.id);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/admin/live-events/${encodeURIComponent(editingEvent.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editTitle.trim(),
          event_date: editEventDate,
          venue: editVenue.trim() || null,
          venue_url: editVenueUrl.trim() || null,
          description: editDescription.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setLiveEvents((prev) =>
          prev.map((ev) =>
            ev.id === editingEvent.id
              ? {
                  ...ev,
                  title: editTitle.trim(),
                  event_date: editEventDate,
                  venue: editVenue.trim() || null,
                  venue_url: editVenueUrl.trim() || null,
                  description: editDescription.trim() || null,
                }
              : ev
          )
        );
        closeEditEvent();
      } else {
        alert(json.error ?? "更新に失敗しました。");
      }
    } catch {
      alert("更新に失敗しました。");
    } finally {
      setSavingEventId(null);
    }
  }

  async function handleDeleteLiveEvent(eventId: string) {
    if (!auth?.currentUser) return;
    if (!confirm("このライブ予定を削除しますか？")) return;
    setDeletingEventId(eventId);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/admin/live-events/${encodeURIComponent(eventId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setLiveEvents((prev) => prev.filter((ev) => ev.id !== eventId));
      } else {
        alert(json.error ?? "削除に失敗しました。");
      }
    } catch {
      alert("削除に失敗しました。");
    } finally {
      setDeletingEventId(null);
    }
  }

  async function handleAddAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!auth?.currentUser || !newAnnouncementDate.trim() || !newAnnouncementTitle.trim()) return;
    setAddingAnnouncement(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: newAnnouncementDate.trim(),
          title: newAnnouncementTitle.trim(),
          body: newAnnouncementBody.trim(),
          url: newAnnouncementUrl.trim() || null,
          is_important: newAnnouncementImportant,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.id) {
        setAnnouncements((prev) => [
          { id: json.id, date: json.date, title: json.title, body: json.body ?? "", url: json.url, is_important: json.is_important, created_at: json.created_at ?? "" },
          ...prev,
        ]);
        setNewAnnouncementDate("");
        setNewAnnouncementTitle("");
        setNewAnnouncementBody("");
        setNewAnnouncementUrl("");
        setNewAnnouncementImportant(false);
      } else {
        alert(json.error ?? "登録に失敗しました。");
      }
    } catch {
      alert("登録に失敗しました。");
    } finally {
      setAddingAnnouncement(false);
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    if (!auth?.currentUser) return;
    if (!confirm("このお知らせを削除しますか？")) return;
    setDeletingAnnouncementId(id);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/admin/announcements/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      } else {
        alert(json.error ?? "削除に失敗しました。");
      }
    } catch {
      alert("削除に失敗しました。");
    } finally {
      setDeletingAnnouncementId(null);
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
                  {u.user_id != null ? (
                    <Link
                      href={`/users/${encodeURIComponent(u.user_id)}`}
                      className="text-gray-300 hover:text-electric-blue truncate flex-1 min-w-0"
                    >
                      {u.display_name ?? "(未設定)"}
                      <span className="text-gray-500 ml-1">@{u.user_id}</span>
                    </Link>
                  ) : (
                    <span className="text-gray-300 truncate flex-1 min-w-0">
                      {u.display_name ?? "(未設定)"}
                      <span className="text-gray-500 ml-1">（ID未設定）</span>
                    </span>
                  )}
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
                  <span className="text-gray-300 truncate flex-1 min-w-0">
                    {u.display_name ?? u.email ?? "(表示名なし)"}
                    <span className="text-gray-500 ml-1 text-xs">（プロフィール未設定）</span>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">ライブ日程</CardTitle>
          <CardDescription>
            登録されているライブ予定の一覧です。管理者は編集・削除できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLiveEvents ? (
            <p className="text-gray-500 text-sm">読み込み中...</p>
          ) : liveEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">ライブ予定がありません。</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {liveEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between gap-4 py-2 border-b border-surface-border last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-white">{ev.title}</span>
                    <span className="text-gray-500 ml-2">
                      {ev.event_date}
                      {ev.venue && ` · ${ev.venue}`}
                    </span>
                    {ev.profile_user_id != null ? (
                      <span className="block mt-0.5">
                        <Link
                          href={`/users/${encodeURIComponent(ev.profile_user_id)}`}
                          className="text-electric-blue hover:underline text-xs"
                        >
                          @{ev.profile_user_id}
                          {ev.profile_display_name && `（${ev.profile_display_name}）`}
                        </Link>
                      </span>
                    ) : (
                      <span className="block mt-0.5 text-gray-500 text-xs">
                        uid: {ev.user_id.slice(0, 8)}…
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditEvent(ev)}
                      disabled={!!editingEvent}
                    >
                      編集
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-400/50 hover:bg-red-400/10"
                      disabled={deletingEventId === ev.id}
                      onClick={() => handleDeleteLiveEvent(ev.id)}
                    >
                      {deletingEventId === ev.id ? "削除中..." : "削除"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">Gear-Loomからのおしらせ</CardTitle>
          <CardDescription>
            トップページ右サイドバーに表示される「Gear-Loomからのおしらせ」を記事形式で管理します。タイトル・本文は必須です。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddAnnouncement} className="flex flex-col gap-3 rounded-lg border border-surface-border/80 p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ann-date">日付</Label>
                <Input
                  id="ann-date"
                  type="date"
                  value={newAnnouncementDate}
                  onChange={(e) => setNewAnnouncementDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={newAnnouncementImportant}
                    onChange={(e) => setNewAnnouncementImportant(e.target.checked)}
                    className="rounded border-surface-border"
                  />
                  重要タグを付ける
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-title">タイトル</Label>
              <Input
                id="ann-title"
                value={newAnnouncementTitle}
                onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                placeholder="例：《重要》〇〇のお知らせ"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-body">本文</Label>
              <textarea
                id="ann-body"
                value={newAnnouncementBody}
                onChange={(e) => setNewAnnouncementBody(e.target.value)}
                placeholder="お知らせの本文を入力してください。"
                required
                rows={4}
                className="flex w-full rounded-lg border border-surface-border bg-surface-dark px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-url">リンクURL（任意）</Label>
              <Input
                id="ann-url"
                type="url"
                value={newAnnouncementUrl}
                onChange={(e) => setNewAnnouncementUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <Button type="submit" size="sm" disabled={addingAnnouncement}>
              {addingAnnouncement ? "登録中..." : "お知らせを追加"}
            </Button>
          </form>
          {loadingAnnouncements ? (
            <p className="text-gray-500 text-sm">読み込み中...</p>
          ) : announcements.length === 0 ? (
            <p className="text-gray-500 text-sm">お知らせがありません。上記フォームから追加できます。</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {announcements.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 py-2 border-b border-surface-border last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-gray-500">{a.date}</span>
                    {a.is_important && (
                      <span className="ml-1.5 inline-block rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        重要
                      </span>
                    )}{" "}
                    <span className="text-gray-300 font-medium">{a.title}</span>
                    {a.body && (
                      <p className="mt-0.5 text-gray-500 text-xs line-clamp-2">{a.body}</p>
                    )}
                    {a.url && (
                      <span className="mt-0.5 text-gray-500 text-xs truncate block">{a.url}</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-400 border-red-400/50 hover:bg-red-400/10 shrink-0"
                    disabled={deletingAnnouncementId === a.id}
                    onClick={() => handleDeleteAnnouncement(a.id)}
                  >
                    {deletingAnnouncementId === a.id ? "削除中..." : "削除"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog.Root open={!!editingEvent} onOpenChange={(open) => !open && closeEditEvent()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-surface-border bg-surface-card p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-white mb-4">
              ライブ予定を編集
            </Dialog.Title>
            <form onSubmit={handleSaveLiveEvent} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="admin-ev-title">タイトル</Label>
                <Input
                  id="admin-ev-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-ev-date">日付</Label>
                <Input
                  id="admin-ev-date"
                  type="date"
                  value={editEventDate}
                  onChange={(e) => setEditEventDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-ev-venue">会場</Label>
                <Input
                  id="admin-ev-venue"
                  value={editVenue}
                  onChange={(e) => setEditVenue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-ev-venue-url">会場URL</Label>
                <Input
                  id="admin-ev-venue-url"
                  type="url"
                  value={editVenueUrl}
                  onChange={(e) => setEditVenueUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-ev-desc">メモ</Label>
                <textarea
                  id="admin-ev-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={savingEventId !== null}>
                  {editingEvent && savingEventId === editingEvent.id ? "保存中..." : "保存"}
                </Button>
                <Dialog.Close asChild>
                  <Button type="button" variant="outline" onClick={closeEditEvent}>
                    キャンセル
                  </Button>
                </Dialog.Close>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
