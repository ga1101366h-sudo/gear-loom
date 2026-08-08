import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { POST_CATEGORY_FLAT, getCategoryPathSlugVariants } from "@/data/post-categories";
import { isHiddenReviewId } from "@/data/hidden-reviews";

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
  // あわせて category_id を集め、後段の「レビューがあるカテゴリだけ載せる」判定に使う。
  const reviewCategoryIds = new Set<string>();
  // Firestore に一度も触れられなかった場合だけ、最後に1行だけ警告を出す（下の「ログ方針」を参照）
  let firestoreUnavailable = false;
  let reviewUrlCount = 0;
  try {
    const db = getAdminFirestore();
    if (!db) {
      firestoreUnavailable = true;
    } else {
      const snap = await db.collection("reviews").select("updated_at", "category_id").get();
      snap.docs.forEach((d) => {
        // ★非公開にした記事は sitemap に載せない（2026-08-08）。
        //   category_id も集めない＝「レビューがあるカテゴリだけ載せる」判定の母集団からも外れるので、
        //   非公開記事1件しか無いカテゴリページも sitemap から自動的に外れる。
        //   理由と対象は src/data/hidden-reviews.ts を参照。
        if (isHiddenReviewId(d.id)) {
          return;
        }
        const data = d.data() as { updated_at?: string; category_id?: string };
        addUrl(`/reviews/${d.id}`, data.updated_at || undefined, "weekly");
        reviewUrlCount += 1;
        const catId = String(data.category_id ?? "").trim();
        if (catId) reviewCategoryIds.add(catId);
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
      firestoreUnavailable = true;
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

  // カテゴリ一覧ページ（POST_CATEGORY_FLAT のカテゴリ slug を列挙）
  //
  // ★レビューが1件も無いカテゴリは載せない（2026-08-03）
  // 理由：Search Console 実測で、登録済み27ページに対し「クロール済み - インデックス未登録」が117ページあった。
  //       レビュー0件のカテゴリページは共通ヘッダー・フッターしか本文が無く（実測 約2,170文字のうち大半が共通パーツ）、
  //       中身の無いページを sitemap で大量に申告すると、サイト全体の評価を下げる方向に働く。
  //       レビューが付いたカテゴリは自動的にここに載るようになるので、手作業の除外リストは持たない。
  // ※ここで noindex は付けない。noindex は category/[slug]/page.tsx の generateMetadata 側で
  //   「そのカテゴリのレビューが0件なら noindex」として付ける（sitemap と判定基準を揃えてある）。
  try {
    POST_CATEGORY_FLAT.forEach((c) => {
      const slug = c.slug?.trim();
      if (!slug) return;
      // 1つの slug は複数の表記ゆれ（英語ID／日本語パス／メガメニュー上のパス）で保存されうるため、
      // カテゴリページ本体と同じ getCategoryPathSlugVariants で候補を出して突き合わせる。
      const hasReview = getCategoryPathSlugVariants(slug).some((v) => reviewCategoryIds.has(v));
      if (!hasReview) return;
      addUrl(`/category/${encodeURIComponent(slug)}`, undefined, "weekly");
    });
  } catch (err) {
    console.error("[sitemap] Failed to add category pages", err);
  }

  // ★ログ方針（2026-08-09 第3弾A）
  //   以前はここまでに内訳を4本 console.log していたが、sitemap.xml は
  //   **クロールのたびに実行される**ため、正常時のログが Vercel のログを埋め続けていた。
  //   出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_SEO修正第2弾A_レビュー.md 🟡-3
  //   一方で「0件なのは壊れているからか、データが無いからか」を後から区別したい、という
  //   元のログの目的は残す必要がある。そこで **異常のときだけ1行** 出す形にした：
  //     - 取得例外 … 各 try/catch の console.error（従来どおり）
  //     - Firebase Admin が初期化できていない／レビューURLが1本も無い … 下の console.warn
  //   正常時は1行も出さない。
  if (firestoreUnavailable || reviewUrlCount === 0) {
    console.warn(
      `[sitemap] 異常の可能性: firestore利用不可=${firestoreUnavailable} / レビューURL=${reviewUrlCount}本 / 機材=${gearCount}件 / 総URL=${urls.length}本`
    );
  }

  return urls;
}

