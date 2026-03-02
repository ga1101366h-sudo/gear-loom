"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore, getFirebaseStorage } from "@/lib/firebase/client";
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

const ACCEPT_IMAGE = "image/jpeg,image/png,image/webp,image/gif";

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "/profile";
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseFirestore();
  const storage = getFirebaseStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gearImagesInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [mainInstrument, setMainInstrument] = useState("");
  const [ownedGear, setOwnedGear] = useState("");
  const [snsTwitter, setSnsTwitter] = useState("");
  const [snsInstagram, setSnsInstagram] = useState("");
  const [snsYoutube, setSnsYoutube] = useState("");
  const [snsTwitch, setSnsTwitch] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [bandName, setBandName] = useState("");
  const [bandUrl, setBandUrl] = useState("");
  const [ownedGearImages, setOwnedGearImages] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [gearSaving, setGearSaving] = useState(false);
  const [gearError, setGearError] = useState<string | null>(null);
  const [ownedGearCategory, setOwnedGearCategory] = useState("");
  const [ownedGearMakerInput, setOwnedGearMakerInput] = useState("");
  const [ownedGearNameInput, setOwnedGearNameInput] = useState("");
  const [showProfilePreview, setShowProfilePreview] = useState(false);

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
        setOwnedGear(p.owned_gear ?? "");
        setOwnedGearImages(p.owned_gear_images ?? []);
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
      const ext = file.name.split(".").pop() ?? "jpg";
      const storagePath = `avatars/${user.uid}/${Date.now()}.${ext}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "profiles", user.uid), {
        avatar_url: url,
        updated_at: new Date().toISOString(),
      });
      setAvatarUrl(url);
      setProfile((prev) => (prev ? { ...prev, avatar_url: url } : null));
      setMessage({ type: "success", text: "アイコンを更新しました。" });
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

  async function handleOwnedGearImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user || !db || !storage) return;
    setMessage(null);
    setGearError(null);
    try {
      const urls: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const ext = file.name.split(".").pop() ?? "jpg";
        const storagePath = `owned-gear-images/${user.uid}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
      }
      if (urls.length > 0) {
        const newList = [...ownedGearImages, ...urls];
        await updateDoc(doc(db, "profiles", user.uid), {
          owned_gear_images: newList,
          updated_at: new Date().toISOString(),
        });
        setOwnedGearImages(newList);
        setProfile((prev) => (prev ? { ...prev, owned_gear_images: newList } : prev));
        setMessage({ type: "success", text: "所有機材画像を追加しました。" });
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "所有機材画像のアップロードに失敗しました。",
      });
    } finally {
      e.target.value = "";
    }
  }

  function getOwnedGearCategoryLabel(value: string): string {
    return value === "guitar"
      ? "ギター"
      : value === "bass"
        ? "ベース"
        : value === "guitar-effects"
          ? "ギターエフェクター"
          : value === "bass-effects"
            ? "ベースエフェクター"
            : value === "board"
              ? "エフェクターボード"
              : value === "amp"
                ? "アンプ"
                : value === "keyboard"
                  ? "鍵盤"
                  : value === "drums"
                    ? "ドラム"
                    : value === "vocal"
                      ? "ボーカル"
                      : value === "dtm"
                        ? "DTM・レコーディング"
                        : "その他";
  }

  async function handleAddOwnedGearLine() {
    if (!user || !db) return;
    if (!ownedGearCategory || !ownedGearNameInput.trim()) {
      setGearError("カテゴリと機材名を入力してください。");
      return;
    }
    setGearError(null);
    setGearSaving(true);
    try {
      const categoryLabel = getOwnedGearCategoryLabel(ownedGearCategory);
      const lineCore = `${ownedGearMakerInput ? `${ownedGearMakerInput} / ` : ""}${ownedGearNameInput}`.trim();
      const line = `[${categoryLabel}] ${lineCore}`;
      const existing = ownedGear ?? "";
      const newText = existing ? `${existing}\n${line}` : line;
      await updateDoc(doc(db, "profiles", user.uid), {
        owned_gear: newText.trim() || null,
        updated_at: new Date().toISOString(),
      });
      setOwnedGear(newText);
      setProfile((prev) => (prev ? { ...prev, owned_gear: newText } : prev));
      setOwnedGearNameInput("");
    } catch (err: unknown) {
      console.error(err);
      setGearError("所有機材への追加に失敗しました。");
    } finally {
      setGearSaving(false);
    }
  }

  async function handleDeleteOwnedGearLine(index: number) {
    if (!user || !db) return;
    const lines = (ownedGear ?? "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (index < 0 || index >= lines.length) return;
    setGearError(null);
    setGearSaving(true);
    try {
      const newLines = lines.filter((_, i) => i !== index);
      const newText = newLines.join("\n");
      await updateDoc(doc(db, "profiles", user.uid), {
        owned_gear: newText.trim() || null,
        updated_at: new Date().toISOString(),
      });
      setOwnedGear(newText);
      setProfile((prev) => (prev ? { ...prev, owned_gear: newText || null } : prev));
    } catch (err: unknown) {
      console.error(err);
      setGearError("所有機材の削除に失敗しました。");
    } finally {
      setGearSaving(false);
    }
  }

  async function handleDeleteOwnedGearImage(url: string) {
    if (!user || !db) return;
    const newList = ownedGearImages.filter((u) => u !== url);
    setGearError(null);
    setGearSaving(true);
    try {
      await updateDoc(doc(db, "profiles", user.uid), {
        owned_gear_images: newList,
        updated_at: new Date().toISOString(),
      });
      setOwnedGearImages(newList);
      setProfile((prev) => (prev ? { ...prev, owned_gear_images: newList } : prev));
    } catch (err: unknown) {
      console.error(err);
      setGearError("所有機材画像の削除に失敗しました。");
    } finally {
      setGearSaving(false);
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
        owned_gear: ownedGear.trim() || null,
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
    <div className="max-w-md mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">プロフィール編集</CardTitle>
          <CardDescription>
            自己紹介・担当楽器・所有機材・SNSリンクを設定できます（マイページに表示されます）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="mainInstrument">担当楽器（任意）</Label>
              <Input
                id="mainInstrument"
                value={mainInstrument}
                onChange={(e) => setMainInstrument(e.target.value)}
                placeholder="例: ギター、ベース"
              />
            </div>
            <div className="space-y-2">
              <Label>所有機材（任意）</Label>
              <div className="space-y-3 border border-surface-border/60 rounded-lg p-3 bg-surface-card/40">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">カテゴリから追加</Label>
                  <select
                    value={ownedGearCategory}
                    onChange={(e) => setOwnedGearCategory(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100"
                  >
                    <option value="">カテゴリを選択...</option>
                    <option value="guitar">ギター</option>
                    <option value="bass">ベース</option>
                    <option value="guitar-effects">ギターエフェクター</option>
                    <option value="bass-effects">ベースエフェクター</option>
                    <option value="board">エフェクターボード</option>
                    <option value="amp">アンプ</option>
                    <option value="keyboard">鍵盤</option>
                    <option value="drums">ドラム</option>
                    <option value="vocal">ボーカル</option>
                    <option value="dtm">DTM・レコーディング</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="text"
                    placeholder="メーカー（任意）"
                    value={ownedGearMakerInput}
                    onChange={(e) => setOwnedGearMakerInput(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="text"
                    placeholder="機材名"
                    value={ownedGearNameInput}
                    onChange={(e) => setOwnedGearNameInput(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddOwnedGearLine}
                    disabled={gearSaving}
                  >
                    {gearSaving ? "追加中..." : "所有機材に追加"}
                  </Button>
                  {gearError && (
                    <p className="text-xs text-red-400 mt-1">{gearError}</p>
                  )}
                </div>
                {ownedGear.trim() && (
                  <ul className="mt-2 space-y-1 text-sm text-gray-200">
                    {ownedGear
                      .split(/\r?\n/)
                      .map((line) => line.trim())
                      .filter(Boolean)
                      .map((line, idx) => (
                        <li key={idx} className="flex items-start gap-2 group">
                          <span className="mt-[3px] text-electric-blue shrink-0">•</span>
                          <span className="whitespace-pre-wrap flex-1 min-w-0">
                            {line}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 h-7 px-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteOwnedGearLine(idx)}
                            disabled={gearSaving}
                            aria-label="この機材を削除"
                          >
                            削除
                          </Button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>所有機材の写真（任意・複数可）</Label>
              <div className="space-y-2">
                {ownedGearImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {ownedGearImages.map((url) => (
                      <div
                        key={url}
                        className="relative w-20 h-20 rounded-md overflow-hidden border border-surface-border group"
                      >
                        <Image src={url} alt="" fill className="object-cover" sizes="80px" unoptimized />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 min-w-0 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          onClick={() => handleDeleteOwnedGearImage(url)}
                          disabled={gearSaving}
                          aria-label="この画像を削除"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-1">
                  <input
                    ref={gearImagesInputRef}
                    type="file"
                    accept={ACCEPT_IMAGE}
                    multiple
                    className="hidden"
                    onChange={handleOwnedGearImagesChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => gearImagesInputRef.current?.click()}
                  >
                    所有機材の写真を追加
                  </Button>
                  <p className="text-xs text-gray-500">JPEG/PNG/WebP/GIF、1枚あたり3MB程度までを推奨</p>
                </div>
              </div>
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
            <div className="space-y-2">
              <Label htmlFor="snsTwitter">Twitter / X URL（任意）</Label>
              <Input
                id="snsTwitter"
                type="url"
                value={snsTwitter}
                onChange={(e) => setSnsTwitter(e.target.value)}
                placeholder="https://twitter.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="snsInstagram">Instagram URL（任意）</Label>
              <Input
                id="snsInstagram"
                type="url"
                value={snsInstagram}
                onChange={(e) => setSnsInstagram(e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="snsYoutube">YouTube URL（任意）</Label>
              <Input
                id="snsYoutube"
                type="url"
                value={snsYoutube}
                onChange={(e) => setSnsYoutube(e.target.value)}
                placeholder="https://youtube.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="snsTwitch">Twitch URL（任意）</Label>
              <Input
                id="snsTwitch"
                type="url"
                value={snsTwitch}
                onChange={(e) => setSnsTwitch(e.target.value)}
                placeholder="https://www.twitch.tv/..."
              />
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
            <div className="space-y-2">
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "保存中..." : "保存"}
              </Button>
              {profile?.user_id && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowProfilePreview(true)}
                  >
                    他の人からはこう見えますよ
                  </Button>
                  <ProfilePreviewOverlay
                    userId={profile.user_id}
                    open={showProfilePreview}
                    onClose={() => setShowProfilePreview(false)}
                  />
                </>
              )}
            </div>
          </form>
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
