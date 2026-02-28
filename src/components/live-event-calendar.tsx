"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LiveEvent } from "@/types/database";

export function LiveEventCalendar({ initialEvents }: { initialEvents: LiveEvent[] }) {
  const { user } = useAuth();
  const db = getFirebaseFirestore();
  const [events, setEvents] = useState<LiveEvent[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [venueUrl, setVenueUrl] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  async function refreshEvents() {
    if (!user || !db) return;
    const q = query(collection(db, "live_events"), where("user_id", "==", user.uid));
    const snap = await getDocs(q);
    const list: LiveEvent[] = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          user_id: data.user_id ?? "",
          title: data.title ?? "",
          event_date: data.event_date ?? "",
          venue: data.venue ?? null,
          venue_url: data.venue_url ?? null,
          description: data.description ?? null,
          start_time: data.start_time ?? null,
          end_time: data.end_time ?? null,
          created_at: data.created_at ?? "",
          updated_at: data.updated_at ?? "",
        } as LiveEvent;
      })
      .sort((a, b) => (a.event_date || "").localeCompare(b.event_date || ""));
    setEvents(list);
  }

  function openFormForEdit(ev: LiveEvent) {
    setEditingId(ev.id);
    setTitle(ev.title);
    setEventDate(ev.event_date || "");
    setVenue(ev.venue ?? "");
    setVenueUrl(ev.venue_url ?? "");
    setDescription(ev.description ?? "");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setTitle("");
    setEventDate("");
    setVenue("");
    setVenueUrl("");
    setDescription("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !db || !title.trim() || !eventDate) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        title: title.trim(),
        event_date: eventDate,
        venue: venue.trim() || null,
        venue_url: venueUrl.trim() || null,
        description: description.trim() || null,
        updated_at: now,
      };
      if (editingId) {
        await updateDoc(doc(db, "live_events", editingId), payload);
      } else {
        await addDoc(collection(db, "live_events"), {
          user_id: user.uid,
          ...payload,
          created_at: now,
        });
      }
      closeForm();
      await refreshEvents();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!db) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "live_events", id));
      await refreshEvents();
    } finally {
      setLoading(false);
    }
  }

  const upcoming = events.filter((ev) => ev.event_date >= new Date().toISOString().slice(0, 10));
  const past = events.filter((ev) => ev.event_date < new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => (formOpen ? closeForm() : setFormOpen(true))}
      >
        {formOpen ? "キャンセル" : "予定を追加"}
      </Button>

      {formOpen && (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-lg border border-surface-border bg-surface-card/50">
          <div className="space-y-2">
            <Label htmlFor="ev-title">タイトル（必須）</Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 〇〇ライブハウス"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-date">日付（必須）</Label>
            <Input
              id="ev-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-venue">会場</Label>
            <Input
              id="ev-venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="例: 〇〇ライブハウス"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-venue-url">会場URL</Label>
            <Input
              id="ev-venue-url"
              type="url"
              value={venueUrl}
              onChange={(e) => setVenueUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-desc">メモ</Label>
            <textarea
              id="ev-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="詳細や備考"
              rows={2}
              className="flex w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? (editingId ? "保存中..." : "追加中...") : editingId ? "保存" : "追加"}
          </Button>
        </form>
      )}

      <div className="space-y-4">
        {upcoming.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">今後の予定</h3>
            <ul className="space-y-2">
              {upcoming.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-surface-border bg-surface-card/50 p-3"
                >
                  <div>
                    <p className="font-medium text-white">{ev.title}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(ev.event_date).toLocaleDateString("ja-JP", {
                        weekday: "short",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      {ev.venue && ` · ${ev.venue}`}
                    </p>
                    {ev.venue_url && (
                      <a
                        href={ev.venue_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-electric-blue hover:underline"
                      >
                        会場情報
                      </a>
                    )}
                    {ev.description && (
                      <p className="text-sm text-gray-500 mt-1">{ev.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-electric-blue"
                      onClick={() => openFormForEdit(ev)}
                      disabled={loading}
                    >
                      編集
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => handleDelete(ev.id)}
                      disabled={loading}
                    >
                      削除
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {past.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">過去の予定</h3>
            <ul className="space-y-2">
              {past.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-surface-border bg-surface-card/30 p-3 opacity-80"
                >
                  <div>
                    <p className="font-medium text-gray-300">{ev.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(ev.event_date).toLocaleDateString("ja-JP")}
                      {ev.venue && ` · ${ev.venue}`}
                    </p>
                    {ev.venue_url && (
                      <a
                        href={ev.venue_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-electric-blue hover:underline"
                      >
                        会場情報
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-electric-blue"
                      onClick={() => openFormForEdit(ev)}
                      disabled={loading}
                    >
                      編集
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-red-400"
                      onClick={() => handleDelete(ev.id)}
                      disabled={loading}
                    >
                      削除
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {events.length === 0 && !formOpen && (
          <p className="text-gray-500 text-sm">ライブ予定がありません。「予定を追加」から登録できます。</p>
        )}
      </div>
    </div>
  );
}
