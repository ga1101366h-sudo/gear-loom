import { getAdminFirestore } from "./admin";
import { prisma } from "@/lib/prisma";
import { getCategoryLevel, getAllTargetSlugs, getAllTargetItems } from "@/data/category-search";
import { getCategoryLabel, getCategoryPathSlugVariants } from "@/data/post-categories";
import type { Review, Category, Maker, LiveEvent, Profile, Gear } from "@/types/database";

export type ReviewDetail = Review & {
  categories?: { id: string; name_ja: string; slug: string };
  profiles?: { id: string; display_name: string | null; avatar_url: string | null; user_id: string | null };
  review_images?: { id: string; storage_path: string; sort_order: number }[];
  review_spec_tags?: { spec_tags: { id: string; name_ja: string } }[];
};

function profileFromDoc(
  docSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
): Profile {
  const data = docSnap.data() ?? {};
  return {
    id: docSnap.id,
    display_name: (data.display_name as string) ?? null,
    avatar_url: (data.avatar_url as string) ?? null,
    user_id: (data.user_id as string) ?? null,
    phone: (data.phone as string) ?? null,
    bio: (data.bio as string) ?? null,
    main_instrument: (data.main_instrument as string) ?? null,
    owned_gear: (data.owned_gear as string) ?? null,
    owned_gear_images: (data.owned_gear_images as string[] | null) ?? null,
    band_name: (data.band_name as string) ?? null,
    band_url: (data.band_url as string) ?? null,
    sns_twitter: (data.sns_twitter as string) ?? null,
    sns_instagram: (data.sns_instagram as string) ?? null,
    sns_youtube: (data.sns_youtube as string) ?? null,
    sns_twitch: (data.sns_twitch as string) ?? null,
    contact_email: (data.contact_email as string) ?? null,
    created_at: (data.created_at as string) ?? "",
    updated_at: (data.updated_at as string) ?? "",
  } as Profile;
}

/**
 * user_id フィールドまたはドキュメントIDでプロフィールを取得。
 * レビュー記事は user_id（ハンドル）でリンク、ボード記事は Firebase UID でリンクするため、
 * 両方でヒットするよう doc(id) をフォールバックに使う。
 */
export async function getProfileByUserIdFromFirestore(userId: string): Promise<Profile | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  const trimmed = userId.trim();
  if (!trimmed) return null;
  try {
    const snap = await db
      .collection("profiles")
      .where("user_id", "==", trimmed)
      .limit(1)
      .get();
    if (!snap.empty) {
      return profileFromDoc(snap.docs[0]);
    }
    const docSnap = await db.collection("profiles").doc(trimmed).get();
    if (docSnap.exists) {
      return profileFromDoc(docSnap);
    }
    return null;
  } catch {
    return null;
  }
}

export type BoardPostWithLikes = {
  id: string;
  title: string;
  boardName: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  likeCount: number;
};

export async function getBoardPostsWithLikesByUserUid(
  userUid: string
): Promise<{ posts: BoardPostWithLikes[]; totalLikes: number }> {
  const trimmedUid = userUid.trim();
  if (!trimmedUid) return { posts: [], totalLikes: 0 };

  let rawPosts:
    | {
        id: string;
        title: string;
        updatedAt: Date;
        board: { name: string; actualPhotoUrl: string | null; thumbnail: string | null };
      }[]
    | null = null;
  try {
    rawPosts = await prisma.boardPost.findMany({
      where: { isPublic: true, board: { userId: trimmedUid } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        board: { select: { name: true, actualPhotoUrl: true, thumbnail: true } },
      },
    });
  } catch (err) {
    console.error("[getBoardPostsWithLikesByUserUid] prisma error", err);
    return { posts: [], totalLikes: 0 };
  }

  if (!rawPosts || rawPosts.length === 0) return { posts: [], totalLikes: 0 };

  const posts: BoardPostWithLikes[] = rawPosts.map((p) => {
    const boardName = p.board?.name?.trim() || "エフェクターボード";
    const title = p.title?.trim() || boardName;
    const thumbnailUrl =
      (p.board?.actualPhotoUrl?.trim() || p.board?.thumbnail?.trim()) ?? null;
    return {
      id: p.id,
      title,
      boardName,
      updatedAt: p.updatedAt.toISOString(),
      thumbnailUrl,
      likeCount: 0,
    };
  });

  const db = getAdminFirestore();
  if (!db) return { posts, totalLikes: 0 };

  const likeCountMap = new Map<string, number>();
  let totalLikes = 0;
  const ids = posts.map((p) => p.id);

  const chunkSize = 10;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    try {
      const snap = await db
        .collection("board_likes")
        .where("post_id", "in", chunk)
        .get();
      snap.docs.forEach((d) => {
        const data = d.data() as { post_id?: string };
        const pid = data.post_id;
        if (!pid) return;
        const prev = likeCountMap.get(pid) ?? 0;
        likeCountMap.set(pid, prev + 1);
        totalLikes += 1;
      });
    } catch (err) {
      console.error("[getBoardPostsWithLikesByUserUid] board_likes query error", err);
    }
  }

  const postsWithLikes = posts.map((p) => ({
    ...p,
    likeCount: likeCountMap.get(p.id) ?? 0,
  }));

  return { posts: postsWithLikes, totalLikes };
}

/** トップページ右サイドバー用：user_id が設定されているプロフィールを取得（updated_at の新しい順、最大 limit 件） */
export type ProfileListItem = {
  profile_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  owned_gear: string | null;
  main_instrument: string | null;
  bio: string | null;
  band_name: string | null;
};
export async function getProfilesListForTopPage(limit = 20): Promise<ProfileListItem[]> {
  const { unstable_noStore } = await import("next/cache");
  unstable_noStore();
  const db = getAdminFirestore();
  if (!db) return [];
  try {
    const snap = await db.collection("profiles").limit(100).get();
    const list: {
      profile_id: string;
      user_id: string;
      display_name: string | null;
      avatar_url: string | null;
      owned_gear: string | null;
      main_instrument: string | null;
      bio: string | null;
      band_name: string | null;
      updated_at: string;
    }[] = [];
    snap.docs.forEach((d) => {
      const data = d.data();
      const user_id = (data.user_id as string)?.trim();
      if (!user_id) return;
      list.push({
        profile_id: d.id,
        user_id,
        display_name: (data.display_name as string) ?? null,
        avatar_url: (data.avatar_url as string) ?? null,
        owned_gear: (data.owned_gear as string) ?? null,
        main_instrument: (data.main_instrument as string) ?? null,
        bio: (data.bio as string) ?? null,
        band_name: (data.band_name as string) ?? null,
        updated_at: (data.updated_at as string) ?? "",
      });
    });
    list.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
    return list.slice(0, limit).map(
      ({ profile_id, user_id, display_name, avatar_url, owned_gear, main_instrument, bio, band_name }) => ({
        profile_id,
        user_id,
        display_name,
        avatar_url,
        owned_gear,
        main_instrument,
        bio,
        band_name,
      })
    );
  } catch {
    return [];
  }
}

type FirestoreDb = NonNullable<ReturnType<typeof getAdminFirestore>>;

/** author_id 一覧から profiles を一括取得し Map で返す */
async function getProfilesByAuthorIds(
  db: FirestoreDb,
  authorIds: string[]
): Promise<Map<string, { display_name: string | null; user_id: string | null; avatar_url: string | null }>> {
  const unique = [...new Set(authorIds.filter((id) => id?.trim()))];
  if (unique.length === 0) return new Map();
  const snaps = await Promise.all(
    unique.map((id) => db.collection("profiles").doc(id).get())
  );
  const map = new Map<string, { display_name: string | null; user_id: string | null; avatar_url: string | null }>();
  snaps.forEach((snap, i) => {
    const uid = unique[i];
    if (!snap.exists || !uid) return;
    const data = snap.data();
    map.set(uid, {
      display_name: (data?.display_name as string) ?? null,
      user_id: (data?.user_id as string) ?? null,
      avatar_url: (data?.avatar_url as string) ?? null,
    });
  });
  return map;
}

/** Firebase UID（profiles の doc id）一覧からプロフィールを一括取得。一覧ページの投稿者表示用。 */
export async function getProfilesByUids(
  uids: string[]
): Promise<Map<string, { display_name: string | null; user_id: string | null; avatar_url: string | null }>> {
  const db = getAdminFirestore();
  if (!db) return new Map();
  return getProfilesByAuthorIds(db, uids);
}

export async function getReviewsFromFirestore(
  limit?: number,
  categorySlug?: string,
  parentParam?: string
): Promise<Review[]> {
  const db = getAdminFirestore();
  if (!db) return [];
  try {
    let snap;
    if (categorySlug) {
      let slugTrimmed = categorySlug.trim();
      try {
        while (slugTrimmed.includes("%")) {
          const decoded = decodeURIComponent(slugTrimmed);
          if (decoded === slugTrimmed) break;
          slugTrimmed = decoded;
        }
      } catch {
        // デコード失敗時はそのまま使用
      }
      const parentDecoded =
        parentParam != null && parentParam !== ""
          ? (() => {
              try {
                return decodeURIComponent(String(parentParam).trim());
              } catch {
                return String(parentParam).trim();
              }
            })()
          : undefined;

      const displayName = getCategoryLabel(slugTrimmed) || slugTrimmed;
      const level = getCategoryLevel(displayName);
      const targetItems = getAllTargetItems(displayName);
      const seenIds = new Set<string>();
      const docs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[] = [];

      console.log("=== カテゴリ検索デバッグ ===");
      console.log("① デコード済みの検索ワード(slug):", slugTrimmed);
      console.log("② parent(param):", parentDecoded ?? "(なし)");
      console.log("③ 解決した表示名(displayName):", displayName);
      console.log("④ 階層(level):", level);
      console.log("⑤ 取得した検索対象配列(targetItems):", targetItems);
      const targetSlugsForLog =
        parentDecoded != null && parentDecoded !== ""
          ? getAllTargetSlugs(displayName, parentDecoded)
          : getAllTargetSlugs(displayName);
      console.log("⑥ 取得したslug配列(targetSlugs):", targetSlugsForLog);
      console.log("========================");

      if (level !== null) {
        const targetSlugs =
          parentDecoded != null && parentDecoded !== ""
            ? getAllTargetSlugs(displayName, parentDecoded)
            : getAllTargetSlugs(displayName);
        const slugsToQuery =
          targetSlugs.length > 0
            ? targetSlugs
            : getCategoryPathSlugVariants(slugTrimmed).length > 0
              ? getCategoryPathSlugVariants(slugTrimmed)
              : [slugTrimmed];
        console.log("⑦ 実際にIN句に渡す配列(slugsToQuery):", slugsToQuery);
        const IN_LIMIT = 10;
        for (let i = 0; i < slugsToQuery.length; i += IN_LIMIT) {
          const chunk = slugsToQuery.slice(i, i + IN_LIMIT);
          if (chunk.length === 0) continue;
          const q = db.collection("reviews").where("category_slug", "in", chunk);
          const snapIn = await q.get();
          for (const doc of snapIn.docs) {
            if (!seenIds.has(doc.id)) {
              seenIds.add(doc.id);
              docs.push(doc);
            }
          }
        }
      }

      if (docs.length === 0) {
        const slugsToTry = getCategoryPathSlugVariants(slugTrimmed);
        const fallback = slugsToTry.length > 0 ? slugsToTry : [slugTrimmed];
        for (const s of fallback) {
          const q = db
            .collection("reviews")
            .where("category_slug", ">=", s)
            .where("category_slug", "<=", s + "\uf8ff")
            .orderBy("category_slug");
          const snapSlug = await q.get();
          for (const doc of snapSlug.docs) {
            if (!seenIds.has(doc.id)) {
              seenIds.add(doc.id);
              docs.push(doc);
            }
          }
        }
      }

      snap = { docs, empty: docs.length === 0 } as { docs: typeof docs; empty: boolean };
    } else {
      let q = db.collection("reviews").orderBy("created_at", "desc");
      if (limit) q = q.limit(limit) as ReturnType<typeof q.limit>;
      snap = await q.get();
    }
    const authorIdsNeedingProfile = [...new Set(
      snap.docs
        .map((d) => {
          const data = d.data();
          const authorId = (data.author_id as string) ?? "";
          const hasDenormalized =
            data.author_user_id != null || data.author_display_name != null;
          return hasDenormalized ? "" : authorId;
        })
        .filter((id) => id?.trim())
    )];
    const profileMap = await getProfilesByAuthorIds(db, authorIdsNeedingProfile);

    const reviews: Review[] = snap.docs.map((d) => {
      const data = d.data();
      const authorId = (data.author_id as string) ?? "";
      const fromDoc =
        data.author_user_id != null || data.author_display_name != null
          ? {
              display_name: data.author_display_name ?? null,
              user_id: data.author_user_id ?? null,
              avatar_url: (data.author_avatar_url as string) ?? null,
            }
          : null;
      const fromProfile = authorId ? profileMap.get(authorId) : null;
      const profile = fromDoc ?? fromProfile;
      return {
        id: d.id,
        author_id: authorId,
        category_id: data.category_id ?? "",
        maker_id: data.maker_id ?? null,
        maker_name: (data.maker_name as string | null) ?? null,
        title: data.title ?? "",
        gear_name: data.gear_name ?? "",
        rating: data.rating ?? 0,
        body_md: data.body_md ?? null,
        body_html: data.body_html ?? null,
        youtube_url: (data.youtube_url as string | null) ?? null,
        event_url: (data.event_url as string | null) ?? null,
        situations: (data.situations as string[] | null) ?? null,
        created_at: data.created_at ?? "",
        updated_at: data.updated_at ?? "",
        categories: data.category_name_ja
          ? { id: "", slug: (data.category_slug as string) ?? "", name_ja: data.category_name_ja, name_en: null, sort_order: 0, created_at: "" }
          : undefined,
        profiles: profile
          ? {
              id: authorId,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              user_id: profile.user_id,
              phone: null,
              bio: null,
              main_instrument: null,
              owned_gear: null,
              sns_twitter: null,
              sns_instagram: null,
              sns_youtube: null,
              sns_twitch: null,
              contact_email: null,
              created_at: "",
              updated_at: "",
            }
          : undefined,
        review_images: (data.review_images as { storage_path: string; sort_order: number }[] | undefined) ?? [],
      } as Review;
    });
    if (categorySlug) {
      reviews.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      if (limit) return reviews.slice(0, limit);
    }
    return reviews;
  } catch {
    return [];
  }
}

/** 公開プロフィール用：指定ユーザー（author_id = プロフィール doc id）が投稿したレビュー一覧 */
export async function getReviewsByAuthorIdFromFirestore(
  authorId: string,
  limit?: number
): Promise<Review[]> {
  const db = getAdminFirestore();
  if (!db) return [];
  if (!authorId.trim()) return [];
  try {
    const snap = await db.collection("reviews").where("author_id", "==", authorId).get();
    const reviews: Review[] = snap.docs
      .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        author_id: data.author_id ?? "",
        category_id: data.category_id ?? "",
        maker_id: data.maker_id ?? null,
        maker_name: (data.maker_name as string | null) ?? null,
        title: data.title ?? "",
        gear_name: data.gear_name ?? "",
        rating: data.rating ?? 0,
        body_md: data.body_md ?? null,
        body_html: data.body_html ?? null,
        youtube_url: (data.youtube_url as string | null) ?? null,
        event_url: (data.event_url as string | null) ?? null,
        situations: (data.situations as string[] | null) ?? null,
        created_at: data.created_at ?? "",
        updated_at: data.updated_at ?? "",
        categories: data.category_name_ja
          ? { id: "", slug: (data.category_slug as string) ?? "", name_ja: data.category_name_ja, name_en: null, sort_order: 0, created_at: "" }
          : undefined,
        profiles: undefined,
        review_images: (data.review_images as { storage_path: string; sort_order: number }[] | undefined) ?? [],
      } as Review;
      })
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    return limit ? reviews.slice(0, limit) : reviews;
  } catch {
    return [];
  }
}

export async function getMakersByGroupFromFirestore(): Promise<Record<string, string[]>> {
  const db = getAdminFirestore();
  if (!db) return {};
  try {
    const snap = await db.collection("makers").get();
    const map: Record<string, string[]> = {};
    snap.docs.forEach((d) => {
      const data = d.data();
      const slug = (data.group_slug as string) ?? "";
      if (!map[slug]) map[slug] = [];
      if (data.name && !map[slug].includes(data.name)) map[slug].push(data.name);
    });
    return map;
  } catch {
    return {};
  }
}

export async function getCategoriesFromFirestore(): Promise<Category[]> {
  const db = getAdminFirestore();
  if (!db) return [];
  try {
    const snap = await db.collection("categories").orderBy("sort_order").get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        slug: data.slug ?? "",
        name_ja: data.name_ja ?? "",
        name_en: data.name_en ?? null,
        sort_order: data.sort_order ?? 0,
        group_slug: data.group_slug ?? null,
        created_at: data.created_at ?? "",
      } as Category;
    });
  } catch {
    return [];
  }
}

export async function getReviewByIdFromFirestore(id: string): Promise<ReviewDetail | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  try {
    const docSnap = await db.collection("reviews").doc(id).get();
    if (!docSnap.exists) return null;
    const data = docSnap.data()!;
    return {
      id: docSnap.id,
      author_id: data.author_id ?? "",
      category_id: data.category_id ?? "",
      maker_id: data.maker_id ?? null,
      maker_name: (data.maker_name as string | null) ?? null,
      title: data.title ?? "",
      gear_name: data.gear_name ?? "",
      rating: data.rating ?? 0,
      body_md: data.body_md ?? null,
      body_html: data.body_html ?? null,
      youtube_url: (data.youtube_url as string | null) ?? null,
      event_url: (data.event_url as string | null) ?? null,
      situations: (data.situations as string[] | null) ?? null,
      created_at: data.created_at ?? "",
      updated_at: data.updated_at ?? "",
      categories: data.category_name_ja
        ? { id: "", name_ja: data.category_name_ja, slug: (data.category_slug as string) ?? "" }
        : undefined,
      profiles: {
        id: "",
        display_name: (data.author_display_name as string) ?? null,
        avatar_url: (data.author_avatar_url as string) ?? null,
        user_id: (data.author_user_id as string) ?? null,
      },
      review_images: (data.review_images as { storage_path: string; sort_order: number }[]) ?? [],
      review_spec_tags: (data.review_spec_tags as { spec_tags: { id: string; name_ja: string } }[]) ?? [],
    } as ReviewDetail;
  } catch {
    return null;
  }
}

/** 機材IDで1件取得（詳細ページ用） */
export async function getGearByIdFromFirestore(id: string): Promise<Gear | null> {
  const db = getAdminFirestore();
  if (!db || !id) return null;
  try {
    const snap = await db.collection("gears").doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data()!;
    return {
      id: snap.id,
      name: String(data.name ?? ""),
      imageUrl: String(data.imageUrl ?? ""),
      affiliateUrl: String(data.affiliateUrl ?? ""),
      reviewCount: Number(data.reviewCount ?? 0),
      createdAt: data.createdAt?.toMillis?.()
        ? new Date(data.createdAt.toMillis()).toISOString()
        : String(data.createdAt ?? ""),
    };
  } catch {
    return null;
  }
}

export async function getReviewLikeCountFromFirestore(reviewId: string): Promise<number> {
  const db = getAdminFirestore();
  if (!db) return 0;
  try {
    const snap = await db.collection("review_likes").where("review_id", "==", reviewId).get();
    return snap.size;
  } catch {
    return 0;
  }
}

/** 複数レビューIDのいいね数を一括取得（公開プロフィール等で使用） */
export async function getReviewLikeCountsForIdsFromFirestore(
  reviewIds: string[]
): Promise<Record<string, number>> {
  const db = getAdminFirestore();
  const result: Record<string, number> = {};
  if (!db || reviewIds.length === 0) return result;
  const CHUNK = 10;
  try {
    for (let i = 0; i < reviewIds.length; i += CHUNK) {
      const chunk = reviewIds.slice(i, i + CHUNK);
      const snap = await db.collection("review_likes").where("review_id", "in", chunk).get();
      snap.docs.forEach((d) => {
        const rid = d.data().review_id as string;
        if (rid) result[rid] = (result[rid] ?? 0) + 1;
      });
    }
    return result;
  } catch {
    return result;
  }
}

export async function getReviewHelpfulCountFromFirestore(reviewId: string): Promise<number> {
  const db = getAdminFirestore();
  if (!db) return 0;
  try {
    const snap = await db.collection("review_helpfuls").where("review_id", "==", reviewId).get();
    return snap.size;
  } catch {
    return 0;
  }
}

/** レビュー＋いいね数。いいね数・★数の多い順でソート用 */
export type ReviewWithLikes = Review & { likeCount: number };

export async function getPopularReviewsFromFirestore(limit = 20): Promise<ReviewWithLikes[]> {
  const db = getAdminFirestore();
  if (!db) return [];
  try {
    const [reviewsSnap, likesSnap] = await Promise.all([
      db.collection("reviews").orderBy("created_at", "desc").limit(150).get(),
      db.collection("review_likes").get(),
    ]);
    const likeCountByReviewId: Record<string, number> = {};
    likesSnap.docs.forEach((d) => {
      const rid = d.data().review_id;
      if (rid) likeCountByReviewId[rid] = (likeCountByReviewId[rid] ?? 0) + 1;
    });
    const authorIdsNeedingProfile = [...new Set(
      reviewsSnap.docs
        .map((d) => {
          const data = d.data();
          const authorId = (data.author_id as string) ?? "";
          const hasDenormalized =
            data.author_user_id != null || data.author_display_name != null;
          return hasDenormalized ? "" : authorId;
        })
        .filter((id) => id?.trim())
    )];
    const profileMap = await getProfilesByAuthorIds(db, authorIdsNeedingProfile);

    const reviews: ReviewWithLikes[] = reviewsSnap.docs.map((d) => {
      const data = d.data();
      const authorId = (data.author_id as string) ?? "";
      const fromDoc =
        data.author_user_id != null || data.author_display_name != null
          ? {
              display_name: data.author_display_name ?? null,
              user_id: data.author_user_id ?? null,
              avatar_url: (data.author_avatar_url as string) ?? null,
            }
          : null;
      const fromProfile = authorId ? profileMap.get(authorId) : null;
      const profile = fromDoc ?? fromProfile;
      const likeCount = likeCountByReviewId[d.id] ?? 0;
      return {
        id: d.id,
        author_id: authorId,
        category_id: data.category_id ?? "",
        maker_id: data.maker_id ?? null,
        maker_name: (data.maker_name as string | null) ?? null,
        title: data.title ?? "",
        gear_name: data.gear_name ?? "",
        rating: data.rating ?? 0,
        body_md: data.body_md ?? null,
        body_html: data.body_html ?? null,
        youtube_url: (data.youtube_url as string | null) ?? null,
        event_url: (data.event_url as string | null) ?? null,
        situations: (data.situations as string[] | null) ?? null,
        created_at: data.created_at ?? "",
        updated_at: data.updated_at ?? "",
        categories: data.category_name_ja
          ? { id: "", slug: (data.category_slug as string) ?? "", name_ja: data.category_name_ja, name_en: null, sort_order: 0, created_at: "" }
          : undefined,
        profiles: profile
          ? {
              id: authorId,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              user_id: profile.user_id,
              phone: null,
              bio: null,
              main_instrument: null,
              owned_gear: null,
              sns_twitter: null,
              sns_instagram: null,
              sns_youtube: null,
              sns_twitch: null,
              contact_email: null,
              created_at: "",
              updated_at: "",
            }
          : undefined,
        review_images: (data.review_images as { storage_path: string; sort_order: number }[] | undefined) ?? [],
        likeCount,
      } as ReviewWithLikes;
    });
    reviews.sort((a, b) => {
      if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
    return reviews.slice(0, limit);
  } catch {
    return [];
  }
}

export async function getLiveEventsFromFirestore(): Promise<LiveEvent[]> {
  const db = getAdminFirestore();
  if (!db) return [];
  try {
    const snap = await db.collection("live_events").get();
    const list: LiveEvent[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        user_id: (data.user_id as string) ?? "",
        title: (data.title as string) ?? "",
        event_date: (data.event_date as string) ?? "",
        venue: (data.venue as string) ?? null,
        venue_url: (data.venue_url as string) ?? null,
        description: (data.description as string) ?? null,
        start_time: (data.start_time as string) ?? null,
        end_time: (data.end_time as string) ?? null,
        created_at: (data.created_at as string) ?? "",
        updated_at: (data.updated_at as string) ?? "",
        profile_display_name: null,
        profile_user_id: null,
      };
    });

    // プロフィール情報を紐付け（カレンダーで表示するため）
    const userIdSet = new Set<string>(list.map((ev) => ev.user_id).filter(Boolean));
    await Promise.all(
      Array.from(userIdSet).map(async (uid) => {
        try {
          const profileSnap = await db.collection("profiles").doc(uid).get();
          if (!profileSnap.exists) return;
          const p = profileSnap.data() as Profile | undefined;
          if (!p) return;
          list.forEach((ev) => {
            if (ev.user_id === uid) {
              ev.profile_display_name = p.display_name ?? null;
              ev.profile_user_id = p.user_id ?? null;
              ev.profile_avatar_url = p.avatar_url ?? null;
            }
          });
        } catch {
          // 個別のプロフィール取得失敗は無視
        }
      }),
    );

    list.sort((a, b) => (a.event_date || "").localeCompare(b.event_date || ""));
    return list;
  } catch {
    return [];
  }
}

export async function getLiveEventsByUserIdFromFirestore(userId: string): Promise<LiveEvent[]> {
  const db = getAdminFirestore();
  if (!db) return [];
  try {
    const snap = await db
      .collection("live_events")
      .where("user_id", "==", userId)
      .get();
    const list: LiveEvent[] = snap.docs.map((d) => {
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
    });
    list.sort((a, b) => (a.event_date || "").localeCompare(b.event_date || ""));
    return list;
  } catch {
    return [];
  }
}

/** トップページ「Gear-Loomからのおしらせ」用。公開で読む（記事風：タイトル＋本文） */
export type SiteAnnouncement = {
  id: string;
  date: string;
  title: string;
  body: string;
  url: string | null;
  is_important: boolean;
  created_at: string;
};

export async function getSiteAnnouncementsFromFirestore(limit = 10): Promise<SiteAnnouncement[]> {
  const db = getAdminFirestore();
  if (!db) return [];
  try {
    const snap = await db
      .collection("site_announcements")
      .orderBy("date", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        date: (data.date as string) ?? "",
        title: (data.title as string) ?? "",
        body: (data.body as string) ?? "",
        url: (data.url as string)?.trim() || null,
        is_important: Boolean(data.is_important),
        created_at: (data.created_at as string) ?? "",
      };
    });
  } catch {
    return [];
  }
}

export async function getSiteAnnouncementByIdFromFirestore(id: string): Promise<SiteAnnouncement | null> {
  const db = getAdminFirestore();
  if (!db || !id?.trim()) return null;
  try {
    const snap = await db.collection("site_announcements").doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data()!;
    return {
      id: snap.id,
      date: (data.date as string) ?? "",
      title: (data.title as string) ?? "",
      body: (data.body as string) ?? "",
      url: (data.url as string)?.trim() || null,
      is_important: Boolean(data.is_important),
      created_at: (data.created_at as string) ?? "",
    };
  } catch {
    return null;
  }
}

/** Aboutページ用：集計クエリ（count）で件数を取得。読み取りコストを抑える */
export type AboutPageCounts = {
  reviews: number;
  profiles: number;
  notebookEntries: number;
  liveEvents: number;
  /** 公開されているエフェクターボード投稿数（Prisma） */
  boardPosts: number;
};

export async function getAboutPageCountsFromFirestore(): Promise<AboutPageCounts> {
  const db = getAdminFirestore();
  const fallback: AboutPageCounts = { reviews: 0, profiles: 0, notebookEntries: 0, liveEvents: 0, boardPosts: 0 };
  if (!db) return fallback;

  async function getCount(database: NonNullable<ReturnType<typeof getAdminFirestore>>, collectionName: string): Promise<number> {
    try {
      const colRef = database.collection(collectionName);
      const countSnap = await (colRef as import("@google-cloud/firestore").Query).count().get();
      return countSnap.data().count ?? 0;
    } catch {
      return 0;
    }
  }

  try {
    const [reviews, profiles, notebookEntries, liveEvents] = await Promise.all([
      getCount(db, "reviews"),
      getCount(db, "profiles"),
      getCount(db, "gear_notebook_entries"),
      getCount(db, "live_events"),
    ]);
    return { reviews, profiles, notebookEntries, liveEvents, boardPosts: 0 };
  } catch {
    return fallback;
  }
}

// --- フォロー機能 ---

export type FollowCounts = { followingCount: number; followersCount: number };

/** 指定プロフィールのフォロー数・フォロワー数（集計クエリで取得） */
export async function getFollowCountsFromFirestore(profileUid: string): Promise<FollowCounts> {
  const db = getAdminFirestore();
  if (!db || !profileUid.trim()) return { followingCount: 0, followersCount: 0 };
  try {
    const followingRef = db.collection("follows").where("follower_id", "==", profileUid);
    const followersRef = db.collection("follows").where("following_id", "==", profileUid);
    const [followingSnap, followersSnap] = await Promise.all([
      (followingRef as import("@google-cloud/firestore").Query).count().get(),
      (followersRef as import("@google-cloud/firestore").Query).count().get(),
    ]);
    return {
      followingCount: followingSnap.data().count ?? 0,
      followersCount: followersSnap.data().count ?? 0,
    };
  } catch {
    return { followingCount: 0, followersCount: 0 };
  }
}

/** 自分がフォローしているユーザーID一覧（タイムライン用・最大30件） */
export async function getFollowingIdsFromFirestore(
  myUid: string,
  limit = 30
): Promise<string[]> {
  const db = getAdminFirestore();
  if (!db || !myUid.trim()) return [];
  try {
    const snap = await db
      .collection("follows")
      .where("follower_id", "==", myUid)
      .limit(limit)
      .get();
    return snap.docs.map((d) => (d.data().following_id as string) ?? "").filter(Boolean);
  } catch {
    return [];
  }
}

/** トップページ用：フォロー中ユーザーのレビュー一覧（created_at 降順・新着順、最大 limit 件） */
export async function getReviewsFromFollowedUsersFromFirestore(
  myUid: string,
  limit = 12
): Promise<Review[]> {
  const db = getAdminFirestore();
  if (!db || !myUid.trim()) return [];
  const followingIds = await getFollowingIdsFromFirestore(myUid, 30);
  if (followingIds.length === 0) return [];

  const chunkSize = 10;
  // orderBy を使うと複合インデックスが必要になるため、取得後にメモリで新着順ソートする
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allDocs: any[] = [];
  for (let i = 0; i < followingIds.length; i += chunkSize) {
    const chunk = followingIds.slice(i, i + chunkSize);
    const snap = await db
      .collection("reviews")
      .where("author_id", "in", chunk)
      .limit(80)
      .get();
    snap.docs.forEach((d) => allDocs.push(d));
  }
  allDocs.sort((a, b) => (b.data().created_at ?? "").localeCompare(a.data().created_at ?? ""));
  const trimmed = allDocs.slice(0, limit);
  const authorIds = trimmed.map((d) => (d.data().author_id as string) ?? "").filter(Boolean);
  const profileMap = await getProfilesByAuthorIds(db, authorIds);

  const reviews: Review[] = trimmed.map((d) => {
    const data = d.data();
    const authorId = (data.author_id as string) ?? "";
    const profile = authorId ? profileMap.get(authorId) : null;
    return {
      id: d.id,
      author_id: authorId,
      category_id: (data.category_id as string) ?? "",
      maker_id: (data.maker_id as string) ?? null,
      maker_name: (data.maker_name as string) ?? null,
      title: (data.title as string) ?? "",
      gear_name: (data.gear_name as string) ?? "",
      rating: (data.rating as number) ?? 0,
      body_md: (data.body_md as string) ?? null,
      body_html: (data.body_html as string) ?? null,
      youtube_url: (data.youtube_url as string) ?? null,
      event_url: (data.event_url as string) ?? null,
      situations: (data.situations as string[]) ?? null,
      created_at: (data.created_at as string) ?? "",
      updated_at: (data.updated_at as string) ?? "",
      categories: data.category_name_ja
        ? {
            id: "",
            slug: (data.category_slug as string) ?? "",
            name_ja: data.category_name_ja as string,
            name_en: null,
            sort_order: 0,
            created_at: "",
          }
        : undefined,
      profiles: profile
        ? {
            id: authorId,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            user_id: profile.user_id,
            phone: null,
            bio: null,
            main_instrument: null,
            owned_gear: null,
            sns_twitter: null,
            sns_instagram: null,
            sns_youtube: null,
            sns_twitch: null,
            contact_email: null,
            created_at: "",
            updated_at: "",
          }
        : undefined,
      review_images: (data.review_images as { storage_path: string; sort_order: number }[]) ?? [],
    } as Review;
  });
  return reviews;
}

export type TimelineItemReview = {
  type: "review";
  id: string;
  created_at: string;
  author_id: string;
  title: string;
  gear_name: string;
  category_id: string;
  rating: number;
  review_images?: { storage_path: string; sort_order: number }[];
  category_name_ja?: string;
  profile_display_name?: string | null;
  profile_user_id?: string | null;
};
export type TimelineItemLiveEvent = {
  type: "live_event";
  id: string;
  created_at: string;
  user_id: string;
  title: string;
  event_date: string;
  venue: string | null;
  profile_display_name?: string | null;
  profile_user_id?: string | null;
};
export type TimelineItem = TimelineItemReview | TimelineItemLiveEvent;

const FOLLOW_TIMELINE_REVIEW_LIMIT = 40;
const FOLLOW_TIMELINE_EVENT_LIMIT = 30;

/** フォロー中ユーザーのレビュー＋ライブ予定を時系列で取得（in は10件までなのでチャンクで取得） */
export async function getFollowingTimelineFromFirestore(
  myUid: string,
  limit = 50
): Promise<TimelineItem[]> {
  const db = getAdminFirestore();
  if (!db || !myUid.trim()) return [];
  const followingIds = await getFollowingIdsFromFirestore(myUid, 30);
  if (followingIds.length === 0) return [];

  const items: TimelineItem[] = [];
  const chunkSize = 10;

  for (let i = 0; i < followingIds.length; i += chunkSize) {
    const chunk = followingIds.slice(i, i + chunkSize);
    const reviewsSnap = await db
      .collection("reviews")
      .where("author_id", "in", chunk)
      .orderBy("created_at", "desc")
      .limit(Math.ceil(FOLLOW_TIMELINE_REVIEW_LIMIT / (followingIds.length / chunkSize)) || 15)
      .get();
    reviewsSnap.docs.forEach((d) => {
      const data = d.data();
      items.push({
        type: "review",
        id: d.id,
        created_at: (data.created_at as string) ?? "",
        author_id: (data.author_id as string) ?? "",
        title: (data.title as string) ?? "",
        gear_name: (data.gear_name as string) ?? "",
        category_id: (data.category_id as string) ?? "",
        rating: (data.rating as number) ?? 0,
        review_images: (data.review_images as { storage_path: string; sort_order: number }[]) ?? [],
        category_name_ja: data.category_name_ja as string | undefined,
      });
    });
  }

  for (let i = 0; i < followingIds.length; i += chunkSize) {
    const chunk = followingIds.slice(i, i + chunkSize);
    const eventsSnap = await db
      .collection("live_events")
      .where("user_id", "in", chunk)
      .orderBy("created_at", "desc")
      .limit(Math.ceil(FOLLOW_TIMELINE_EVENT_LIMIT / (followingIds.length / chunkSize)) || 10)
      .get();
    eventsSnap.docs.forEach((d) => {
      const data = d.data();
      items.push({
        type: "live_event",
        id: d.id,
        created_at: (data.created_at as string) ?? "",
        user_id: (data.user_id as string) ?? "",
        title: (data.title as string) ?? "",
        event_date: (data.event_date as string) ?? "",
        venue: (data.venue as string) ?? null,
      });
    });
  }

  items.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  const trimmed = items.slice(0, limit);

  const authorUids = [...new Set(trimmed.map((x) => (x.type === "review" ? x.author_id : x.user_id)))].filter(Boolean);
  const profileMap = new Map<string, { display_name: string | null; user_id: string | null }>();
  await Promise.all(
    authorUids.map(async (uid) => {
      try {
        const snap = await db.collection("profiles").doc(uid).get();
        const d = snap.data();
        profileMap.set(uid, {
          display_name: (d?.display_name as string) ?? null,
          user_id: (d?.user_id as string) ?? null,
        });
      } catch {
        profileMap.set(uid, { display_name: null, user_id: null });
      }
    })
  );

  return trimmed.map((item) => {
    const uid = item.type === "review" ? item.author_id : item.user_id;
    const profile = profileMap.get(uid);
    if (item.type === "review") {
      return { ...item, profile_display_name: profile?.display_name ?? null, profile_user_id: profile?.user_id ?? null };
    }
    return { ...item, profile_display_name: profile?.display_name ?? null, profile_user_id: profile?.user_id ?? null };
  });
}
