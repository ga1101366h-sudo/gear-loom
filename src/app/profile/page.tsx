"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSWRConfig } from "swr";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore, getFirebaseStorage } from "@/lib/firebase/client";
import { getStoragePathFromDownloadUrl } from "@/lib/utils";
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
import { ProfilePreviewOverlay } from "@/components/profile-preview-overlay";
import type { Profile } from "@/types/database";

const ACCEPT_IMAGE = "image/jpeg,image/jpg,image/png,image/webp";

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "/profile";
  const { user, loading: authLoading } = useAuth();
  const { mutate: globalMutate } = useSWRConfig();
  const db = getFirebaseFirestore();
  const storage = getFirebaseStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [mainInstrument, setMainInstrument] = useState("");
  const [snsTwitter, setSnsTwitter] = useState("");
  const [snsInstagram, setSnsInstagram] = useState("");
  const [snsYoutube, setSnsYoutube] = useState("");
  const [snsTwitch, setSnsTwitch] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [bandName, setBandName] = useState("");
  const [bandUrl, setBandUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    if (!showProfilePreview || !user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        if (!token) return;
        const res = await fetch("/api/me/follow-counts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { followingCount?: number; followersCount?: number };
        if (typeof data.followingCount === "number") setFollowingCount(data.followingCount);
        if (typeof data.followersCount === "number") setFollowersCount(data.followersCount);
      } catch {
        // ignore
      }
    })();
  }, [showProfilePreview, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!db) {
      setLoading(false);
      return;
    }
    (async () => {
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      const data = profileSnap.data();
      const userIdSet = data && data.user_id != null && String(data.user_id).trim() !== "";
      if (!userIdSet) {
        setLoading(false);
        router.replace(`/onboarding?next=${encodeURIComponent(nextUrl)}`);
        return;
      }
      if (data) {
        const p: Profile = {
          id: user.uid,
          display_name: data.display_name ?? null,
          avatar_url: data.avatar_url ?? null,
          user_id: data.user_id ?? null,
          phone: data.phone ?? null,
          bio: data.bio ?? null,
          main_instrument: data.main_instrument ?? null,
          owned_gear: data.owned_gear ?? null,
          owned_gear_images: (data.owned_gear_images as string[] | null) ?? null,
          band_name: data.band_name ?? null,
          band_url: data.band_url ?? null,
          sns_twitter: data.sns_twitter ?? null,
          sns_instagram: data.sns_instagram ?? null,
          sns_youtube: data.sns_youtube ?? null,
          sns_twitch: data.sns_twitch ?? null,
          contact_email: data.contact_email ?? null,
          created_at: data.created_at ?? "",
          updated_at: data.updated_at ?? "",
        };
        setProfile(p);
        setDisplayName(p.display_name ?? "");
        setBio(p.bio ?? "");
        setMainInstrument(p.main_instrument ?? "");
        setBandName(p.band_name ?? "");
        setBandUrl(p.band_url ?? "");
        setSnsTwitter(p.sns_twitter ?? "");
        setSnsInstagram(p.sns_instagram ?? "");
        setSnsYoutube(p.sns_youtube ?? "");
        setSnsTwitch(p.sns_twitch ?? "");
        setContactEmail(p.contact_email ?? "");
        setAvatarUrl(p.avatar_url ?? null);
      }
      setLoading(false);
    })();
  }, [user, authLoading, db, router]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user || !db || !storage) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "画像ファイル（JPEG/PNG/WebP/GIF）を選んでください。" });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setMessage({ type: "error", text: "画像は3MB以下にしてください。" });
      return;
    }
    setMessage(null);
    setUploadingAvatar(true);
    try {
      if (avatarUrl) {
        const oldPath = getStoragePathFromDownloadUrl(avatarUrl);
        if (oldPath && storage) {
          try {
            await deleteObject(ref(storage, oldPath));
          } catch {
            // 旧アイコン削除は失敗しても続行
          }
        }
      }
      const ext = file.name.split(".").pop() ?? "jpg";
      const storagePath = `avatars/${user.uid}/${Date.now()}.${ext}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file, {
        cacheControl: "public, max-age=31536000, immutable",
        contentType: file.type || undefined,
      });
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "profiles", user.uid), {
        avatar_url: url,
        updated_at: new Date().toISOString(),
      });
      setAvatarUrl(url);
      setProfile((prev) => (prev ? { ...prev, avatar_url: url } : null));
      setMessage({ type: "success", text: "アイコンを更新しました。" });
      try {
        const token = await user.getIdToken();
        await fetch("/api/me/sync-review-author-fields", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // 過去レビューのアイコン同期は失敗してもアイコン更新は成功扱い
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "アイコンのアップロードに失敗しました。",
      });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !db) return;
    setMessage(null);
    setSaving(true);
    try {
      await updateDoc(doc(db, "profiles", user.uid), {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        main_instrument: mainInstrument.trim() || null,
        band_name: bandName.trim() || null,
        band_url: bandUrl.trim() || null,
        sns_twitter: snsTwitter.trim() || null,
        sns_instagram: snsInstagram.trim() || null,
        sns_youtube: snsYoutube.trim() || null,
        sns_twitch: snsTwitch.trim() || null,
        contact_email: contactEmail.trim() || null,
        updated_at: new Date().toISOString(),
      });
      setMessage({ type: "success", text: "プロフィールを更新しました。" });
      globalMutate(["profiles", user.uid]);
      try {
        const token = await user.getIdToken();
        await fetch("/api/me/sync-review-author-fields", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // 過去レビューの表示名・アイコン同期は失敗してもプロフィール更新は成功扱い
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "更新に失敗しました。",
      });
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            読み込み中...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-4 pt-8 pb-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">プロフィール編集</CardTitle>
          <CardDescription>
            自己紹介・担当楽器・SNSリンクを設定できます（所有機材はマイページの「機材」タブから編集できます）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 上部エリア：2カラム（テキスト情報） */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* 左カラム：基本情報・連絡先 */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>プロフィールアイコン</Label>
                  <div className="flex items-center gap-4">
                    <div className="shrink-0">
                      {avatarUrl ? (
                        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-electric-blue/50 bg-surface-card">
                          <Image
                            src={avatarUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="80px"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div
                          className="w-20 h-20 rounded-full border-2 border-electric-blue/50 bg-surface-card flex items-center justify-center text-2xl font-bold text-electric-blue"
                          aria-hidden
                        >
                          {(displayName || user?.email?.split("@")[0] || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPT_IMAGE}
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingAvatar}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploadingAvatar ? "アップロード中..." : "アイコンを変更"}
                      </Button>
                      <p className="text-xs text-gray-500">JPEG/PNG/WebP/GIF、3MB以下</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">表示名</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="ニックネーム"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ユーザーID</Label>
                  <p className="text-sm text-gray-300">
                    {profile?.user_id ? (
                      <>@{profile.user_id}</>
                    ) : (
                      <>
                        未設定です。{" "}
                        <Link href="/onboarding" className="text-electric-blue hover:underline">
                          オンボーディングで設定
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">自己紹介（マイページに表示）</Label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="自分について・活動内容などを自由に記述"
                    rows={4}
                    className="flex w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-electric-blue"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">連絡用メールアドレス（任意）</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="example@example.com"
                  />
                </div>
              </div>

              {/* 右カラム：活動情報・SNS */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="mainInstrument">担当楽器（任意）</Label>
                  <Input
                    id="mainInstrument"
                    value={mainInstrument}
                    onChange={(e) => setMainInstrument(e.target.value)}
                    placeholder="例: ギター、ベース"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bandName">所属バンド名（任意）</Label>
                  <Input
                    id="bandName"
                    value={bandName}
                    onChange={(e) => setBandName(e.target.value)}
                    placeholder="例: ○○バンド"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bandUrl">バンドURL（任意）</Label>
                  <Input
                    id="bandUrl"
                    type="url"
                    value={bandUrl}
                    onChange={(e) => setBandUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2 pt-2 border-t border-surface-border/50">
                  <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                    SNSリンク（任意）
                  </Label>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="snsTwitter" className="text-xs font-normal text-gray-400">
                        Twitter / X URL
                      </Label>
                      <Input
                        id="snsTwitter"
                        type="url"
                        value={snsTwitter}
                        onChange={(e) => setSnsTwitter(e.target.value)}
                        placeholder="https://twitter.com/..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="snsInstagram" className="text-xs font-normal text-gray-400">
                        Instagram URL
                      </Label>
                      <Input
                        id="snsInstagram"
                        type="url"
                        value={snsInstagram}
                        onChange={(e) => setSnsInstagram(e.target.value)}
                        placeholder="https://instagram.com/..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="snsYoutube" className="text-xs font-normal text-gray-400">
                        YouTube URL
                      </Label>
                      <Input
                        id="snsYoutube"
                        type="url"
                        value={snsYoutube}
                        onChange={(e) => setSnsYoutube(e.target.value)}
                        placeholder="https://youtube.com/..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="snsTwitch" className="text-xs font-normal text-gray-400">
                        Twitch URL
                      </Label>
                      <Input
                        id="snsTwitch"
                        type="url"
                        value={snsTwitch}
                        onChange={(e) => setSnsTwitch(e.target.value)}
                        placeholder="https://www.twitch.tv/..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {message && (
              <p
                className={`text-sm text-center ${
                  message.type === "success" ? "text-electric-blue" : "text-red-400"
                }`}
              >
                {message.text}
              </p>
            )}

            {/* アクションエリア（フル幅・中央寄せ） */}
            <div className="space-y-3 flex flex-col items-center">
              <Button
                type="submit"
                disabled={saving}
                className="w-full max-w-md mx-auto block py-3 text-center font-bold rounded-md bg-transparent border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 transition-colors"
              >
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
          </form>

          {/* プレビューボタンは form の外に配置し、submit が絶対に発火しないようにする */}
          {profile?.user_id && (
            <div className="mt-6 flex flex-col items-center">
              <div
                role="button"
                tabIndex={0}
                aria-label="他の人からはどう見えますか"
                className="w-full max-w-md mx-auto block py-3 text-center font-medium rounded-md bg-transparent border border-surface-border text-gray-200 hover:bg-white/5 transition-colors cursor-pointer border-solid"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowProfilePreview(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowProfilePreview(true);
                  }
                }}
              >
                他の人からはどう見えますか
              </div>
              <ProfilePreviewOverlay
                userId={profile.user_id}
                open={showProfilePreview}
                onClose={() => setShowProfilePreview(false)}
                followersCount={followersCount}
                followingCount={followingCount}
              />
            </div>
          )}
        </CardContent>
      </Card>
      <p className="mt-6 text-center flex flex-wrap justify-center gap-4">
        <Link href="/mypage" className="text-sm text-gray-400 hover:text-electric-blue">
          マイページに戻る
        </Link>
        <Link href="/" className="text-sm text-gray-400 hover:text-electric-blue">
          トップに戻る
        </Link>
      </p>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md py-12 text-center text-gray-400">
          読み込み中...
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
