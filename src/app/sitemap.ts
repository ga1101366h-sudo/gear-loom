import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { POST_CATEGORY_FLAT } from "@/data/post-categories";

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

  // 機材ページ（Firestore gears コレクションのID一覧）
  // gears は「レビュー投稿時に1件ずつ作られる」コレクション（api/reviews/with-gear）。
  // 0件なら機材ページは1枚も存在しないので、一覧ハブ /gears も sitemap に載せない（ソフト404を避ける）。
  let gearCount = 0;
  try {
    const db = getAdminFirestore();
    if (!db) {
      console.error("[sitemap] Firebase Admin が初期化できていないため gears を読み込めません");
    } else {
      const snap = await db.collection("gears").select().get();
      gearCount = snap.size;
      snap.docs.forEach((d) => {
        addUrl(`/gears/${d.id}`, undefined, "weekly");
      });
      if (gearCount > 0) addUrl("/gears", undefined, "daily");
    }
  } catch (err) {
    console.error("[sitemap] Failed to load gears from Firestore", err);
  }
  // 0件は「壊れている」か「データが無い」かの区別が付かないので、必ず件数を残す
  console.log(`[sitemap] gears urls = ${gearCount}`);

  // カテゴリ一覧ページ（POST_CATEGORY_FLAT のカテゴリ slug を列挙）
  try {
    POST_CATEGORY_FLAT.forEach((c) => {
      const slug = c.slug?.trim();
      if (!slug) return;
      addUrl(`/category/${encodeURIComponent(slug)}`, undefined, "weekly");
    });
  } catch (err) {
    console.error("[sitemap] Failed to add category pages", err);
  }

  // 生成結果の内訳を残す（本番で「なぜかURLが少ない」を後から追えるようにする）
  const gearUrlCount = urls.filter((u) => u.url.includes("/gears/")).length;
  console.log(`[sitemap] total urls = ${urls.length} (gear detail = ${gearUrlCount})`);

  return urls;
}

