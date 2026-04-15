"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import toast from "react-hot-toast";
import type { AdminLiveEventItem } from "@/app/api/admin/live-events/route";
import type { AdminAnnouncementItem } from "@/app/api/admin/announcements/route";
import type { AdminNotebookEntryItem } from "@/app/api/admin/notebook-entries/route";

// ─── ローカル型定義 ───────────────────────────────────────────────────────────
type AdminUserItem = {
  id: string;
  display_name: string | null;
  user_id: string | null;
  created_at: string;
};
type IncompleteUserItem = {
  uid: string;
  email: string | null;
  display_name: string | null;
};
type AdminReviewItem = {
  id: string;
  title: string;
  author_id: string;
  created_at: string;
};

/** リスト系データの共通状態 */
type ListState<T> = { items: T[]; loading: boolean; deletingId: string | null };

function makeListState<T>(): ListState<T> {
  return { items: [], loading: false, deletingId: null };
}

/** ライブイベント編集フォーム */
type EditEventForm = {
  event: AdminLiveEventItem | null;
  title: string;
  eventDate: string;
  venue: string;
  venueUrl: string;
  description: string;
  saving: boolean;
};

/** お知らせ新規フォーム */
type NewAnnouncementForm = {
  date: string;
  title: string;
  body: string;
  url: string;
  isImportant: boolean;
  submitting: boolean;
};

/** お知らせ編集フォーム */
type EditAnnouncementForm = {
  announcement: AdminAnnouncementItem | null;
  date: string;
  title: string;
  body: string;
  url: string;
  isImportant: boolean;
  saving: boolean;
};

/** confirm ダイアログの pending 操作 */
type PendingConfirm = {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
} | null;

// ─── コンポーネント ───────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseFirestore();
  const { fetchWithAuth, fetchList } = useAdminFetch();

  // ── 認証 / 権限 ──
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  // ── リスト系データ ──
  const [usersState, setUsersState] = useState<ListState<AdminUserItem>>(makeListState());
  const [incompleteUsersState, setIncompleteUsersState] =
    useState<ListState<IncompleteUserItem>>(makeListState());
  const [reviewsState, setReviewsState] = useState<ListState<AdminReviewItem>>(makeListState());
  const [liveEventsState, setLiveEventsState] =
    useState<ListState<AdminLiveEventItem>>(makeListState());
  const [announcementsState, setAnnouncementsState] =
    useState<ListState<AdminAnnouncementItem>>(makeListState());
  const [notebookState, setNotebookState] =
    useState<ListState<AdminNotebookEntryItem>>(makeListState());

  // ── フォーム：ライブイベント編集 ──
  const [editEventForm, setEditEventForm] = useState<EditEventForm>({
    event: null,
    title: "",
    eventDate: "",
    venue: "",
    venueUrl: "",
    description: "",
    saving: false,
  });

  // ── フォーム：お知らせ新規 ──
  const [newAnnouncementForm, setNewAnnouncementForm] = useState<NewAnnouncementForm>({
    date: "",
    title: "",
    body: "",
    url: "",
    isImportant: false,
    submitting: false,
  });

  // ── フォーム：お知らせ編集 ──
  const [editAnnouncementForm, setEditAnnouncementForm] = useState<EditAnnouncementForm>({
    announcement: null,
    date: "",
    title: "",
    body: "",
    url: "",
    isImportant: false,
    saving: false,
  });

  // ── 検索 / ページネーション ──
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(0);
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewPage, setReviewPage] = useState(0);
  const [notebookPage, setNotebookPage] = useState(0);

  // ── 確認ダイアログ ──
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);
  const [confirmRunning, setConfirmRunning] = useState(false);

  // ─── 派生値 ────────────────────────────────────────────────────────────────
  const isAdmin = isAdminUserId(profileUserId);

  const filteredUsers = usersState.items.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.display_name ?? "").toLowerCase().includes(q) ||
      (u.user_id ?? "").toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = filteredUsers.slice(
    userPage * PAGE_SIZE,
    userPage * PAGE_SIZE + PAGE_SIZE
  );

  const filteredReviews = reviewsState.items.filter((r) => {
    const q = reviewSearch.trim().toLowerCase();
    if (!q) return true;
    return (r.title ?? "").toLowerCase().includes(q);
  });
  const totalReviewPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE));
  const paginatedReviews = filteredReviews.slice(
    reviewPage * PAGE_SIZE,
    reviewPage * PAGE_SIZE + PAGE_SIZE
  );

  const totalNotebookPages = Math.max(
    1,
    Math.ceil(notebookState.items.length / PAGE_SIZE)
  );
  const paginatedNotebookEntries = notebookState.items.slice(
    notebookPage * PAGE_SIZE,
    notebookPage * PAGE_SIZE + PAGE_SIZE
  );

  // ─── 検索リセット ──────────────────────────────────────────────────────────
  useEffect(() => {
    setUserPage(0);
  }, [userSearch]);

  useEffect(() => {
    setReviewPage(0);
  }, [reviewSearch]);

  // ─── プロフィール取得 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid || !db) return;
    getDoc(doc(db, "profiles", user.uid)).then((snap) => {
      setProfileUserId((snap.data()?.user_id as string) ?? null);
    });
  }, [user?.uid, db]);

  // ─── 権限チェック ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?next=/admin");
      return;
    }
    if (profileUserId !== null && !isAdmin) {
      router.push("/");
    }
  }, [user, authLoading, isAdmin, profileUserId, router]);

  // ─── 初期データ取得 ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin || !user) return;

    const load = async () => {
      // 全リストを並列フェッチ
      setUsersState((s) => ({ ...s, loading: true }));
      setIncompleteUsersState((s) => ({ ...s, loading: true }));
      setReviewsState((s) => ({ ...s, loading: true }));
      setNotebookState((s) => ({ ...s, loading: true }));
      setLiveEventsState((s) => ({ ...s, loading: true }));
      setAnnouncementsState((s) => ({ ...s, loading: true }));

      const [users, incompleteUsers, reviews, notebookEntries, liveEvents, announcements] =
        await Promise.all([
          fetchList<AdminUserItem>("/api/admin/users", "users"),
          fetchList<IncompleteUserItem>("/api/admin/incomplete-users", "users"),
          fetchList<AdminReviewItem>("/api/admin/reviews", "reviews"),
          fetchList<AdminNotebookEntryItem>("/api/admin/notebook-entries", "entries"),
          fetchList<AdminLiveEventItem>("/api/admin/live-events", "events"),
          fetchList<AdminAnnouncementItem>("/api/admin/announcements", "announcements"),
        ]);

      setUsersState({ items: users, loading: false, deletingId: null });
      setIncompleteUsersState({ items: incompleteUsers, loading: false, deletingId: null });
      setReviewsState({ items: reviews, loading: false, deletingId: null });
      setNotebookState({ items: notebookEntries, loading: false, deletingId: null });
      setLiveEventsState({ items: liveEvents, loading: false, deletingId: null });
      setAnnouncementsState({ items: announcements, loading: false, deletingId: null });
    };

    load();
  }, [isAdmin, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 確認ダイアログヘルパー ────────────────────────────────────────────────
  function openConfirm(config: NonNullable<PendingConfirm>) {
    setPendingConfirm(config);
  }

  async function handleConfirmExecute() {
    if (!pendingConfirm) return;
    setConfirmRunning(true);
    try {
      await pendingConfirm.onConfirm();
    } finally {
      setConfirmRunning(false);
      setPendingConfirm(null);
    }
  }

  // ─── ユーザー削除 ──────────────────────────────────────────────────────────
  function handleDeleteUser(uid: string) {
    if (uid === user?.uid) return;
    openConfirm({
      title: "ユーザーを削除しますか？",
      description:
        "Firebase Auth のアカウントとプロフィールが削除されます。この操作は取り消せません。",
      onConfirm: async () => {
        setUsersState((s) => ({ ...s, deletingId: uid }));
        try {
          const res = await fetchWithAuth("/api/admin/delete-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid }),
          });
          const json: { error?: string } = await res.json().catch(() => ({}));
          if (res.ok) {
            setUsersState((s) => ({
              ...s,
              items: s.items.filter((u) => u.id !== uid),
              deletingId: null,
            }));
          } else {
            toast.error(json.error ?? "削除に失敗しました。");
            setUsersState((s) => ({ ...s, deletingId: null }));
          }
        } catch {
          toast.error("削除に失敗しました。");
          setUsersState((s) => ({ ...s, deletingId: null }));
        }
      },
    });
  }

  function handleDeleteIncompleteUser(uid: string) {
    if (uid === user?.uid) return;
    openConfirm({
      title: "ユーザー（ID未設定）を削除しますか？",
      description:
        "Firebase Auth のアカウントとプロフィールが削除されます。この操作は取り消せません。",
      onConfirm: async () => {
        setIncompleteUsersState((s) => ({ ...s, deletingId: uid }));
        try {
          const res = await fetchWithAuth("/api/admin/delete-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid }),
          });
          const json: { error?: string } = await res.json().catch(() => ({}));
          if (res.ok) {
            setIncompleteUsersState((s) => ({
              ...s,
              items: s.items.filter((u) => u.uid !== uid),
              deletingId: null,
            }));
          } else {
            toast.error(json.error ?? "削除に失敗しました。");
            setIncompleteUsersState((s) => ({ ...s, deletingId: null }));
          }
        } catch {
          toast.error("削除に失敗しました。");
          setIncompleteUsersState((s) => ({ ...s, deletingId: null }));
        }
      },
    });
  }

  function handleDeleteReview(reviewId: string) {
    openConfirm({
      title: "この記事を削除しますか？",
      description: "削除した記事は復元できません。",
      onConfirm: async () => {
        setReviewsState((s) => ({ ...s, deletingId: reviewId }));
        try {
          const res = await fetchWithAuth("/api/admin/delete-review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reviewId }),
          });
          const json: { error?: string } = await res.json().catch(() => ({}));
          if (res.ok) {
            setReviewsState((s) => ({
              ...s,
              items: s.items.filter((r) => r.id !== reviewId),
              deletingId: null,
            }));
          } else {
            toast.error(json.error ?? "削除に失敗しました。");
            setReviewsState((s) => ({ ...s, deletingId: null }));
          }
        } catch {
          toast.error("削除に失敗しました。");
          setReviewsState((s) => ({ ...s, deletingId: null }));
        }
      },
    });
  }

  function handleDeleteNotebookEntry(entryId: string) {
    openConfirm({
      title: "このカスタム手帳を削除しますか？",
      description: "Firebase からも削除されます。この操作は取り消せません。",
      onConfirm: async () => {
        setNotebookState((s) => ({ ...s, deletingId: entryId }));
        try {
          const res = await fetchWithAuth(
            `/api/admin/notebook-entries/${encodeURIComponent(entryId)}`,
            { method: "DELETE" }
          );
          const json: { error?: string } = await res.json().catch(() => ({}));
          if (res.ok) {
            setNotebookState((s) => ({
              ...s,
              items: s.items.filter((e) => e.id !== entryId),
              deletingId: null,
            }));
          } else {
            toast.error(json.error ?? "削除に失敗しました。");
            setNotebookState((s) => ({ ...s, deletingId: null }));
          }
        } catch {
          toast.error("削除に失敗しました。");
          setNotebookState((s) => ({ ...s, deletingId: null }));
        }
      },
    });
  }

  // ─── ライブイベント ────────────────────────────────────────────────────────
  function openEditEvent(ev: AdminLiveEventItem) {
    setEditEventForm({
      event: ev,
      title: ev.title,
      eventDate: ev.event_date,
      venue: ev.venue ?? "",
      venueUrl: ev.venue_url ?? "",
      description: ev.description ?? "",
      saving: false,
    });
  }

  function closeEditEvent() {
    setEditEventForm({
      event: null,
      title: "",
      eventDate: "",
      venue: "",
      venueUrl: "",
      description: "",
      saving: false,
    });
  }

  async function handleSaveLiveEvent(e: React.FormEvent) {
    e.preventDefault();
    const { event, title, eventDate, venue, venueUrl, description } = editEventForm;
    if (!event || !title.trim() || !eventDate) return;

    setEditEventForm((f) => ({ ...f, saving: true }));
    try {
      const res = await fetchWithAuth(
        `/api/admin/live-events/${encodeURIComponent(event.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            event_date: eventDate,
            venue: venue.trim() || null,
            venue_url: venueUrl.trim() || null,
            description: description.trim() || null,
          }),
        }
      );
      const json: { error?: string } = await res.json().catch(() => ({}));
      if (res.ok) {
        setLiveEventsState((s) => ({
          ...s,
          items: s.items.map((ev) =>
            ev.id === event.id
              ? {
                  ...ev,
                  title: title.trim(),
                  event_date: eventDate,
                  venue: venue.trim() || null,
                  venue_url: venueUrl.trim() || null,
                  description: description.trim() || null,
                }
              : ev
          ),
        }));
        closeEditEvent();
      } else {
        toast.error(json.error ?? "更新に失敗しました。");
        setEditEventForm((f) => ({ ...f, saving: false }));
      }
    } catch {
      toast.error("更新に失敗しました。");
      setEditEventForm((f) => ({ ...f, saving: false }));
    }
  }

  function handleDeleteLiveEvent(eventId: string) {
    openConfirm({
      title: "このライブ予定を削除しますか？",
      description: "削除したライブ予定は復元できません。",
      onConfirm: async () => {
        setLiveEventsState((s) => ({ ...s, deletingId: eventId }));
        try {
          const res = await fetchWithAuth(
            `/api/admin/live-events/${encodeURIComponent(eventId)}`,
            { method: "DELETE" }
          );
          const json: { error?: string } = await res.json().catch(() => ({}));
          if (res.ok) {
            setLiveEventsState((s) => ({
              ...s,
              items: s.items.filter((ev) => ev.id !== eventId),
              deletingId: null,
            }));
          } else {
            toast.error(json.error ?? "削除に失敗しました。");
            setLiveEventsState((s) => ({ ...s, deletingId: null }));
          }
        } catch {
          toast.error("削除に失敗しました。");
          setLiveEventsState((s) => ({ ...s, deletingId: null }));
        }
      },
    });
  }

  // ─── お知らせ ──────────────────────────────────────────────────────────────
  async function handleAddAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    const { date, title, body, url, isImportant } = newAnnouncementForm;
    if (!date.trim() || !title.trim()) return;

    setNewAnnouncementForm((f) => ({ ...f, submitting: true }));
    try {
      const res = await fetchWithAuth("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date.trim(),
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || null,
          is_important: isImportant,
        }),
      });
      const json: AdminAnnouncementItem & { error?: string } = await res
        .json()
        .catch(() => ({}));
      if (res.ok && json.id) {
        setAnnouncementsState((s) => ({
          ...s,
          items: [
            {
              id: json.id,
              date: json.date,
              title: json.title,
              body: json.body ?? "",
              url: json.url,
              is_important: json.is_important,
              created_at: json.created_at ?? "",
            },
            ...s.items,
          ],
        }));
        setNewAnnouncementForm({
          date: "",
          title: "",
          body: "",
          url: "",
          isImportant: false,
          submitting: false,
        });
      } else {
        toast.error(json.error ?? "登録に失敗しました。");
        setNewAnnouncementForm((f) => ({ ...f, submitting: false }));
      }
    } catch {
      toast.error("登録に失敗しました。");
      setNewAnnouncementForm((f) => ({ ...f, submitting: false }));
    }
  }

  function handleDeleteAnnouncement(id: string) {
    openConfirm({
      title: "このお知らせを削除しますか？",
      description: "削除したお知らせは復元できません。",
      onConfirm: async () => {
        setAnnouncementsState((s) => ({ ...s, deletingId: id }));
        try {
          const res = await fetchWithAuth(
            `/api/admin/announcements/${encodeURIComponent(id)}`,
            { method: "DELETE" }
          );
          const json: { error?: string } = await res.json().catch(() => ({}));
          if (res.ok) {
            setAnnouncementsState((s) => ({
              ...s,
              items: s.items.filter((a) => a.id !== id),
              deletingId: null,
            }));
          } else {
            toast.error(json.error ?? "削除に失敗しました。");
            setAnnouncementsState((s) => ({ ...s, deletingId: null }));
          }
        } catch {
          toast.error("削除に失敗しました。");
          setAnnouncementsState((s) => ({ ...s, deletingId: null }));
        }
      },
    });
  }

  function openEditAnnouncement(a: AdminAnnouncementItem) {
    setEditAnnouncementForm({
      announcement: a,
      date: a.date,
      title: a.title,
      body: a.body ?? "",
      url: a.url ?? "",
      isImportant: a.is_important ?? false,
      saving: false,
    });
  }

  async function handleSaveAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    const { announcement, date, title, body, url, isImportant } = editAnnouncementForm;
    if (!announcement) return;

    setEditAnnouncementForm((f) => ({ ...f, saving: true }));
    try {
      const res = await fetchWithAuth(
        `/api/admin/announcements/${encodeURIComponent(announcement.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: date.trim(),
            title: title.trim(),
            body: body.trim(),
            url: url.trim() || null,
            is_important: isImportant,
          }),
        }
      );
      const json: { error?: string } = await res.json().catch(() => ({}));
      if (res.ok) {
        setAnnouncementsState((s) => ({
          ...s,
          items: s.items.map((a) =>
            a.id === announcement.id
              ? {
                  ...a,
                  date: date.trim(),
                  title: title.trim(),
                  body: body.trim(),
                  url: url.trim() || null,
                  is_important: isImportant,
                }
              : a
          ),
        }));
        setEditAnnouncementForm((f) => ({ ...f, announcement: null, saving: false }));
      } else {
        toast.error(json.error ?? "更新に失敗しました。");
        setEditAnnouncementForm((f) => ({ ...f, saving: false }));
      }
    } catch {
      toast.error("更新に失敗しました。");
      setEditAnnouncementForm((f) => ({ ...f, saving: false }));
    }
  }

  // ─── ローディング / 権限ガード ─────────────────────────────────────────────
  if (authLoading || (user && profileUserId === null)) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-gray-400">
        読み込み中...
      </div>
    );
  }
  if (!user || !isAdmin) return null;

  // ─── レンダリング ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-2xl font-bold text-white">管理者ページ</h1>
        <Button variant="outline" asChild>
          <Link href="/">トップへ</Link>
        </Button>
      </div>

      {/* ── 登録ユーザー一覧 ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">登録ユーザー一覧</CardTitle>
          <CardDescription>
            ユーザーを削除すると、Firebase Auth のアカウントとプロフィールが削除されます。自分自身は削除できません。登録が新しい順・10件ずつ表示。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="search"
            placeholder="表示名・ユーザーIDで検索..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="max-w-xs bg-surface-dark border-surface-border"
          />
          {usersState.loading ? (
            <p className="text-gray-500 text-sm">読み込み中...</p>
          ) : usersState.items.length === 0 ? (
            <p className="text-gray-500 text-sm">ユーザーがいません。</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-gray-500 text-sm">検索に一致するユーザーがいません。</p>
          ) : (
            <>
              <ul className="space-y-2 text-sm">
                {paginatedUsers.map((u) => (
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
                          disabled={usersState.deletingId === u.id}
                          onClick={() => handleDeleteUser(u.id)}
                        >
                          {usersState.deletingId === u.id ? "削除中..." : "削除"}
                        </Button>
                      ) : (
                        <span className="text-gray-500 text-xs">（自分）</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination
                page={userPage}
                total={totalUserPages}
                count={filteredUsers.length}
                onPrev={() => setUserPage((p) => Math.max(0, p - 1))}
                onNext={() => setUserPage((p) => Math.min(totalUserPages - 1, p + 1))}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ── ID未設定ユーザー ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">ID未設定のユーザー（未完了）</CardTitle>
          <CardDescription>
            X・Googleでログインしたがプロフィール（ユーザーID）を未設定のまま離脱したユーザーです。削除すると Firebase Auth のアカウントとプロフィールが削除されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incompleteUsersState.loading ? (
            <p className="text-gray-500 text-sm">読み込み中...</p>
          ) : incompleteUsersState.items.length === 0 ? (
            <p className="text-gray-500 text-sm">該当ユーザーはいません。</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {incompleteUsersState.items.map((u) => (
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
                        disabled={incompleteUsersState.deletingId === u.uid}
                        onClick={() => handleDeleteIncompleteUser(u.uid)}
                      >
                        {incompleteUsersState.deletingId === u.uid ? "削除中..." : "削除"}
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

      {/* ── 記事一覧（レビュー） ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">記事一覧（レビュー）</CardTitle>
          <CardDescription>
            管理者は投稿者でなくても記事を削除できます。投稿が新しい順・10件ずつ表示。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="search"
            placeholder="タイトルで検索..."
            value={reviewSearch}
            onChange={(e) => setReviewSearch(e.target.value)}
            className="max-w-xs bg-surface-dark border-surface-border"
          />
          {reviewsState.loading ? (
            <p className="text-gray-500 text-sm">読み込み中...</p>
          ) : reviewsState.items.length === 0 ? (
            <p className="text-gray-500 text-sm">記事がありません。</p>
          ) : filteredReviews.length === 0 ? (
            <p className="text-gray-500 text-sm">検索に一致する記事がありません。</p>
          ) : (
            <>
              <ul className="space-y-2 text-sm">
                {paginatedReviews.map((r) => (
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
                        disabled={reviewsState.deletingId === r.id}
                        onClick={() => handleDeleteReview(r.id)}
                      >
                        {reviewsState.deletingId === r.id ? "削除中..." : "削除"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination
                page={reviewPage}
                total={totalReviewPages}
                count={filteredReviews.length}
                onPrev={() => setReviewPage((p) => Math.max(0, p - 1))}
                onNext={() => setReviewPage((p) => Math.min(totalReviewPages - 1, p + 1))}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ── カスタム手帳一覧 ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">カスタム手帳一覧</CardTitle>
          <CardDescription>
            他ユーザーのカスタム手帳も削除できます。削除時は Firestore と Storage の画像からも削除されます。10件ずつ表示。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notebookState.loading ? (
            <p className="text-gray-500 text-sm">読み込み中...</p>
          ) : notebookState.items.length === 0 ? (
            <p className="text-gray-500 text-sm">カスタム手帳がありません。</p>
          ) : (
            <>
              <ul className="space-y-2 text-sm">
                {paginatedNotebookEntries.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-4 py-2 border-b border-surface-border last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-gray-300 font-medium">{e.title || "(無題)"}</span>
                      <span className="text-gray-500 ml-2">{e.gear_name}</span>
                      <span className="text-gray-500 text-xs block mt-0.5">
                        {e.profile_display_name ?? e.profile_user_id ?? e.user_id?.slice(0, 8)}
                        {e.profile_user_id && ` @${e.profile_user_id}`}
                        {" · "}
                        {e.created_at?.slice(0, 10)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-400/50 hover:bg-red-400/10 shrink-0"
                      disabled={notebookState.deletingId === e.id}
                      onClick={() => handleDeleteNotebookEntry(e.id)}
                    >
                      {notebookState.deletingId === e.id ? "削除中..." : "削除"}
                    </Button>
                  </li>
                ))}
              </ul>
              <Pagination
                page={notebookPage}
                total={totalNotebookPages}
                count={notebookState.items.length}
                onPrev={() => setNotebookPage((p) => Math.max(0, p - 1))}
                onNext={() =>
                  setNotebookPage((p) => Math.min(totalNotebookPages - 1, p + 1))
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ── ライブ日程 ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">ライブ日程</CardTitle>
          <CardDescription>
            登録されているライブ予定の一覧です。管理者は編集・削除できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {liveEventsState.loading ? (
            <p className="text-gray-500 text-sm">読み込み中...</p>
          ) : liveEventsState.items.length === 0 ? (
            <p className="text-gray-500 text-sm">ライブ予定がありません。</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {liveEventsState.items.map((ev) => (
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
                      disabled={!!editEventForm.event}
                    >
                      編集
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-400/50 hover:bg-red-400/10"
                      disabled={liveEventsState.deletingId === ev.id}
                      onClick={() => handleDeleteLiveEvent(ev.id)}
                    >
                      {liveEventsState.deletingId === ev.id ? "削除中..." : "削除"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Gear-Loomからのおしらせ ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">Gear-Loomからのおしらせ</CardTitle>
          <CardDescription>
            トップページ右サイドバーに表示される「Gear-Loomからのおしらせ」を記事形式で管理します。タイトル・本文は必須です。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={handleAddAnnouncement}
            className="flex flex-col gap-3 rounded-lg border border-surface-border/80 p-3"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ann-date">日付</Label>
                <Input
                  id="ann-date"
                  type="date"
                  value={newAnnouncementForm.date}
                  onChange={(e) =>
                    setNewAnnouncementForm((f) => ({ ...f, date: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={newAnnouncementForm.isImportant}
                    onChange={(e) =>
                      setNewAnnouncementForm((f) => ({ ...f, isImportant: e.target.checked }))
                    }
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
                value={newAnnouncementForm.title}
                onChange={(e) =>
                  setNewAnnouncementForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="例：《重要》〇〇のお知らせ"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-body">本文</Label>
              <textarea
                id="ann-body"
                value={newAnnouncementForm.body}
                onChange={(e) =>
                  setNewAnnouncementForm((f) => ({ ...f, body: e.target.value }))
                }
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
                value={newAnnouncementForm.url}
                onChange={(e) =>
                  setNewAnnouncementForm((f) => ({ ...f, url: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            <Button type="submit" size="sm" disabled={newAnnouncementForm.submitting}>
              {newAnnouncementForm.submitting ? "登録中..." : "お知らせを追加"}
            </Button>
          </form>

          {announcementsState.loading ? (
            <p className="text-gray-500 text-sm">読み込み中...</p>
          ) : announcementsState.items.length === 0 ? (
            <p className="text-gray-500 text-sm">
              お知らせがありません。上記フォームから追加できます。
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {announcementsState.items.map((a) => (
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
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-electric-blue border-electric-blue/50 hover:bg-electric-blue/10"
                      onClick={() => openEditAnnouncement(a)}
                    >
                      編集
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-400/50 hover:bg-red-400/10"
                      disabled={announcementsState.deletingId === a.id}
                      onClick={() => handleDeleteAnnouncement(a.id)}
                    >
                      {announcementsState.deletingId === a.id ? "削除中..." : "削除"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── お知らせ編集ダイアログ ── */}
      <Dialog.Root
        open={!!editAnnouncementForm.announcement}
        onOpenChange={(open) =>
          !open && setEditAnnouncementForm((f) => ({ ...f, announcement: null }))
        }
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-surface-border bg-surface-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-lg font-semibold text-white mb-4">
              お知らせを編集
            </Dialog.Title>
            <form onSubmit={handleSaveAnnouncement} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="admin-ann-date">日付</Label>
                <Input
                  id="admin-ann-date"
                  value={editAnnouncementForm.date}
                  onChange={(e) =>
                    setEditAnnouncementForm((f) => ({ ...f, date: e.target.value }))
                  }
                  placeholder="例: 2025-01-15"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-ann-title">タイトル</Label>
                <Input
                  id="admin-ann-title"
                  value={editAnnouncementForm.title}
                  onChange={(e) =>
                    setEditAnnouncementForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="例：《重要》〇〇のお知らせ"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-ann-body">本文</Label>
                <textarea
                  id="admin-ann-body"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editAnnouncementForm.body}
                  onChange={(e) =>
                    setEditAnnouncementForm((f) => ({ ...f, body: e.target.value }))
                  }
                  placeholder="お知らせの本文"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-ann-url">URL（任意）</Label>
                <Input
                  id="admin-ann-url"
                  value={editAnnouncementForm.url}
                  onChange={(e) =>
                    setEditAnnouncementForm((f) => ({ ...f, url: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="admin-ann-important"
                  checked={editAnnouncementForm.isImportant}
                  onChange={(e) =>
                    setEditAnnouncementForm((f) => ({ ...f, isImportant: e.target.checked }))
                  }
                  className="rounded border-gray-600"
                />
                <Label htmlFor="admin-ann-important" className="cursor-pointer">
                  重要マーク
                </Label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={editAnnouncementForm.saving}>
                  {editAnnouncementForm.saving ? "保存中..." : "保存"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setEditAnnouncementForm((f) => ({ ...f, announcement: null }))
                  }
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── ライブイベント編集ダイアログ ── */}
      <Dialog.Root
        open={!!editEventForm.event}
        onOpenChange={(open) => !open && closeEditEvent()}
      >
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
                  value={editEventForm.title}
                  onChange={(e) =>
                    setEditEventForm((f) => ({ ...f, title: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-ev-date">日付</Label>
                <Input
                  id="admin-ev-date"
                  type="date"
                  value={editEventForm.eventDate}
                  onChange={(e) =>
                    setEditEventForm((f) => ({ ...f, eventDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-ev-venue">会場</Label>
                <Input
                  id="admin-ev-venue"
                  value={editEventForm.venue}
                  onChange={(e) =>
                    setEditEventForm((f) => ({ ...f, venue: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-ev-venue-url">会場URL</Label>
                <Input
                  id="admin-ev-venue-url"
                  type="url"
                  value={editEventForm.venueUrl}
                  onChange={(e) =>
                    setEditEventForm((f) => ({ ...f, venueUrl: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-ev-desc">メモ</Label>
                <textarea
                  id="admin-ev-desc"
                  value={editEventForm.description}
                  onChange={(e) =>
                    setEditEventForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={2}
                  className="flex w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={editEventForm.saving}>
                  {editEventForm.saving ? "保存中..." : "保存"}
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

      {/* ── 削除確認ダイアログ ── */}
      <ConfirmDialog
        open={!!pendingConfirm}
        title={pendingConfirm?.title ?? ""}
        description={pendingConfirm?.description ?? ""}
        confirmLabel={confirmRunning ? "実行中..." : "削除する"}
        onConfirm={handleConfirmExecute}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}

// ─── ページネーション サブコンポーネント ───────────────────────────────────────
function Pagination({
  page,
  total,
  count,
  onPrev,
  onNext,
}: {
  page: number;
  total: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page === 0}
        onClick={onPrev}
        aria-label="前のページ"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-gray-400">
        {page + 1} / {total}（{count}件）
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= total - 1}
        onClick={onNext}
        aria-label="次のページ"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
