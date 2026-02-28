import { getAdminFirestore } from "./admin";
import type { Review, Category, Maker, LiveEvent, Profile } from "@/types/database";

export type ReviewDetail = Review & {
  categories?: { id: string; name_ja: string; slug: string };
  profiles?: { id: string; display_name: string | null; avatar_url: string | null; user_id: string | null };
  review_images?: { id: string; storage_path: string; sort_order: number }[];
  review_spec_tags?: { spec_tags: { id: string; name_ja: string } }[];
};

export async function getProfileByUserIdFromFirestore(userId: string): Promise<Profile | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  const normalized = userId.trim().toLowerCase();
  if (!normalized) return null;
  try {
    const snap = await db
      .collection("profiles")
      .where("user_id", "==", normalized)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    const data = docSnap.data();
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
  } catch {
    return null;
  }
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

export async function getReviewsFromFirestore(
  limit?: number,
  categorySlug?: string
): Promise<Review[]> {
  const db = getAdminFirestore();
  if (!db) return [];
  try {
    let snap;
    if (categorySlug) {
      const q = db.collection("reviews").where("category_slug", "==", categorySlug);
      snap = await q.get();
    } else {
      let q = db.collection("reviews").orderBy("created_at", "desc");
      if (limit) q = q.limit(limit) as ReturnType<typeof q.limit>;
      snap = await q.get();
    }
    const reviews: Review[] = snap.docs.map((d) => {
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
        situations: (data.situations as string[] | null) ?? null,
        created_at: data.created_at ?? "",
        updated_at: data.updated_at ?? "",
        categories: data.category_name_ja
          ? { id: "", slug: (data.category_slug as string) ?? "", name_ja: data.category_name_ja, name_en: null, sort_order: 0, created_at: "" }
          : undefined,
        profiles: data.author_user_id != null || data.author_display_name != null
          ? {
              id: "",
              display_name: data.author_display_name ?? null,
              avatar_url: null,
              user_id: data.author_user_id ?? null,
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
    const reviews: ReviewWithLikes[] = reviewsSnap.docs.map((d) => {
      const data = d.data();
      const likeCount = likeCountByReviewId[d.id] ?? 0;
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
        situations: (data.situations as string[] | null) ?? null,
        created_at: data.created_at ?? "",
        updated_at: data.updated_at ?? "",
        categories: data.category_name_ja
          ? { id: "", slug: (data.category_slug as string) ?? "", name_ja: data.category_name_ja, name_en: null, sort_order: 0, created_at: "" }
          : undefined,
        profiles: data.author_user_id != null || data.author_display_name != null
          ? {
              id: "",
              display_name: data.author_display_name ?? null,
              avatar_url: null,
              user_id: data.author_user_id ?? null,
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
