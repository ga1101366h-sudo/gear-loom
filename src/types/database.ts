export interface Category {
  id: string;
  slug: string;
  name_ja: string;
  name_en: string | null;
  sort_order: number;
  group_slug?: string | null;
  created_at: string;
}

export interface Maker {
  id: string;
  name: string;
  group_slug: string;
  created_at: string;
}

export interface SpecTag {
  id: string;
  slug: string;
  name_ja: string;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  user_id: string | null;
  phone: string | null;
  bio: string | null;
  main_instrument: string | null;
  owned_gear: string | null;
  owned_gear_images?: string[] | null;
  band_name: string | null;
  band_url: string | null;
  sns_twitter: string | null;
  sns_instagram: string | null;
  sns_youtube: string | null;
  sns_twitch: string | null;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewLike {
  id: string;
  user_id: string;
  review_id: string;
  created_at: string;
}

export interface LiveEvent {
  id: string;
  user_id: string;
  title: string;
  event_date: string;
  venue: string | null;
  venue_url: string | null;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
  // オプション: 関連プロフィール情報（トップページ用）
  profile_display_name?: string | null;
  profile_user_id?: string | null;
  profile_avatar_url?: string | null;
}

/** 管理者お知らせ（トップの「管理者からのお知らせ」に表示） */
export interface Announcement {
  id: string;
  title: string;
  /** 本文（任意） */
  content?: string | null;
  url: string;
  /** 画像URL（Storage の download URL） */
  image_url?: string | null;
  published_at: string;
  created_at: string;
}

export interface Review {
  id: string;
  author_id: string;
  category_id: string;
  maker_id?: string | null;
  maker_name?: string | null;
  title: string;
  gear_name: string;
  rating: number;
  body_md: string | null;
  body_html: string | null;
  youtube_url?: string | null;
  situations?: string[] | null;
  created_at: string;
  updated_at: string;
  categories?: Category;
  profiles?: Profile;
  review_images?: ReviewImage[];
  review_spec_tags?: { spec_tags: SpecTag }[];
}

export interface ReviewImage {
  id: string;
  review_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
}

export interface ReviewCompareEntry {
  id: string;
  user_id: string;
  review_id: string;
  created_at: string;
}

export interface GearNotebookEntry {
  id: string;
  user_id: string;
  gear_name: string;
  maker_name: string | null;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}
