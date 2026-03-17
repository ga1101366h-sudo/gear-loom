import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getAdminFirestore } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.gear-loom.com");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [];

  type ChangeFreq = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

  const addUrl = (path: string, lastMod?: string, changefreq: ChangeFreq = "weekly") => {
    urls.push({
      url: `${SITE_URL}${path}`,
      lastModified: lastMod ? new Date(lastMod) : new Date(),
      changeFrequency: changefreq,
      priority: path === "/" ? 1 : 0.7,
    });
  };

  // 固定ページ
  addUrl("/", undefined, "daily");
  addUrl("/boards", undefined, "hourly");
  addUrl("/reviews", undefined, "hourly");
  addUrl("/blog");
  addUrl("/login");
  addUrl("/signup");
  addUrl("/notebook");
  addUrl("/about");
  addUrl("/terms");
  addUrl("/privacy");
  addUrl("/contact");
  addUrl("/help");

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

  return urls;
}

