-- GearNexus: 初期スキーマ
-- 実行: Supabase Dashboard > SQL Editor で実行、または supabase db push

-- ============================================
-- 1. カテゴリ（大分類: ギター、ベース、ドラム等）
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_ja TEXT NOT NULL,
  name_en TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 初期カテゴリデータ
INSERT INTO public.categories (slug, name_ja, name_en, sort_order) VALUES
  ('guitar', 'ギター', 'Guitar', 1),
  ('bass', 'ベース', 'Bass', 2),
  ('drums', 'ドラム', 'Drums', 3),
  ('vocal', 'ボーカル', 'Vocal', 4),
  ('keyboard', '鍵盤', 'Keyboard', 5),
  ('dtm-other', 'DTM・その他', 'DTM & Other', 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. スペックタグ（コンプレッサー、真空管、デジタル等）
-- ============================================
CREATE TABLE IF NOT EXISTS public.spec_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_ja TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 初期スペックタグ例
INSERT INTO public.spec_tags (slug, name_ja) VALUES
  ('compressor', 'コンプレッサー'),
  ('tube', '真空管'),
  ('digital', 'デジタル'),
  ('analog', 'アナログ'),
  ('modeling', 'モデリング'),
  ('pedal', 'ペダル'),
  ('amp', 'アンプ'),
  ('interface', 'オーディオインターフェース')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 3. プロフィール（auth.users と 1:1、拡張情報）
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  main_instrument TEXT,
  owned_gear TEXT,
  sns_twitter TEXT,
  sns_instagram TEXT,
  sns_youtube TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 4. レビュー投稿 (UGC)
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  gear_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body_md TEXT,
  body_html TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- レビュー ↔ スペックタグ（多対多）
CREATE TABLE IF NOT EXISTS public.review_spec_tags (
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  spec_tag_id UUID NOT NULL REFERENCES public.spec_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (review_id, spec_tag_id)
);

-- ============================================
-- 5. レビュー画像（Supabase Storage と連携）
-- ============================================
CREATE TABLE IF NOT EXISTS public.review_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 6. インデックス
-- ============================================
CREATE INDEX IF NOT EXISTS idx_reviews_author ON public.reviews(author_id);
CREATE INDEX IF NOT EXISTS idx_reviews_category ON public.reviews(category_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_images_review ON public.review_images(review_id);

-- ============================================
-- 7. RLS とポリシー
-- ============================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spec_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_spec_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;

-- カテゴリ・スペックタグ: 全員読み取り可
CREATE POLICY "categories_select" ON public.categories FOR SELECT USING (true);
CREATE POLICY "spec_tags_select" ON public.spec_tags FOR SELECT USING (true);

-- プロフィール: 自分は全操作、他者は読み取りのみ
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- レビュー: 一覧・詳細は全員、作成・更新・削除は本人のみ
CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "reviews_update" ON public.reviews FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "reviews_delete" ON public.reviews FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "review_spec_tags_select" ON public.review_spec_tags FOR SELECT USING (true);
CREATE POLICY "review_spec_tags_insert" ON public.review_spec_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.author_id = auth.uid()));
CREATE POLICY "review_spec_tags_delete" ON public.review_spec_tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.author_id = auth.uid()));

CREATE POLICY "review_images_select" ON public.review_images FOR SELECT USING (true);
CREATE POLICY "review_images_insert" ON public.review_images FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.author_id = auth.uid()));
CREATE POLICY "review_images_delete" ON public.review_images FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.author_id = auth.uid()));

-- ============================================
-- 8. プロフィール自動作成（サインアップ時）
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 9. updated_at 自動更新
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
