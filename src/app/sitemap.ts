import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getAdminFirestore } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const SITE_URL = "https://www.gear-loom.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();

  type ChangeFreq = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

  const addUrl = (path: string, lastMod?: string, changefreq: ChangeFreq = "weekly") => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    if (seen.has(normalizedPath)) return;
    seen.add(normalizedPath);
    urls.push({
      url: `${SITE_URL}${normalizedPath}`,
      lastModified: lastMod ? new Date(lastMod) : new Date(),
      changeFrequency: changefreq,
      priority: normalizedPath === "/" ? 1 : 0.7,
    });
  };

  // 固定ページ（価値の高い公開ページのみ）
  addUrl("/", undefined, "daily");
  addUrl("/boards", undefined, "hourly");
  addUrl("/reviews", undefined, "hourly");
  addUrl("/blog");
  addUrl("/events");

  // 公開ボード記事（BoardPost）
  try {
    const posts = await prisma.boardPost.findMany({
      where: { isPublic: true },
      select: { id: true, updatedAt: true },
    });
    posts.forEach((p) => {
      addUrl(`/boards/post/${p.id}`, p.updatedAt.toISOString(), "weekly");
    });
  } catch (err) {
    console.error("[sitemap] Failed to load BoardPost from prisma", err);
  }

  // レビュー記事（Firestore reviews コレクションのID一覧）
  try {
    const db = getAdminFirestore();
    if (db) {
      const snap = await db.collection("reviews").select().get();
      snap.docs.forEach((d) => {
        const data = d.data() as { updated_at?: string };
        addUrl(`/reviews/${d.id}`, data.updated_at || undefined, "weekly");
      });
    }
  } catch (err) {
    console.error("[sitemap] Failed to load reviews from Firestore", err);
  }

  // 公開プロフィール（profiles の user_id を優先）
  try {
    const db = getAdminFirestore();
    if (db) {
      const snap = await db.collection("profiles").select("user_id").get();
      snap.docs.forEach((d) => {
        const data = d.data() as { user_id?: string };
        const profileId = String(data.user_id ?? "").trim() || d.id;
        if (!profileId) return;
        addUrl(`/users/${encodeURIComponent(profileId)}`, undefined, "weekly");
      });
    }
  } catch (err) {
    console.error("[sitemap] Failed to load profiles from Firestore", err);
  }

  return urls;
}

