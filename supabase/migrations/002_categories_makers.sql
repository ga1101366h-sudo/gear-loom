-- ジャンル細分化（ギターエフェクター、ベースエフェクター）とメーカー動的追加用

-- ============================================
-- 1. カテゴリに group_slug を追加（メーカー紐づけ用）
-- ============================================
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS group_slug TEXT;

UPDATE public.categories SET group_slug = 'guitar-bass' WHERE slug IN ('guitar', 'bass');
UPDATE public.categories SET group_slug = 'amps-effects' WHERE slug IN ('guitar-effects', 'bass-effects');
UPDATE public.categories SET group_slug = 'drums' WHERE slug = 'drums';
UPDATE public.categories SET group_slug = 'keyboards-synths' WHERE slug = 'keyboard';
UPDATE public.categories SET group_slug = 'other' WHERE slug IN ('vocal', 'dtm-other');

-- ギターエフェクター・ベースエフェクターを追加
INSERT INTO public.categories (slug, name_ja, name_en, sort_order, group_slug) VALUES
  ('guitar-effects', 'ギターエフェクター', 'Guitar Effects', 2, 'amps-effects'),
  ('bass-effects', 'ベースエフェクター', 'Bass Effects', 3, 'amps-effects')
ON CONFLICT (slug) DO NOTHING;

-- 既存の sort_order を振り直し（ギター1, ギターエフェクター2, ベース3, ベースエフェクター4, ドラム5, ...）
UPDATE public.categories SET sort_order = 1 WHERE slug = 'guitar';
UPDATE public.categories SET sort_order = 2 WHERE slug = 'guitar-effects';
UPDATE public.categories SET sort_order = 3 WHERE slug = 'bass';
UPDATE public.categories SET sort_order = 4 WHERE slug = 'bass-effects';
UPDATE public.categories SET sort_order = 5 WHERE slug = 'drums';
UPDATE public.categories SET sort_order = 6 WHERE slug = 'vocal';
UPDATE public.categories SET sort_order = 7 WHERE slug = 'keyboard';
UPDATE public.categories SET sort_order = 8 WHERE slug = 'dtm-other';

UPDATE public.categories SET group_slug = 'amps-effects' WHERE slug IN ('guitar-effects', 'bass-effects');

-- ============================================
-- 2. メーカー（ユーザー追加可能）
-- ============================================
CREATE TABLE IF NOT EXISTS public.makers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  group_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, group_slug)
);

CREATE INDEX IF NOT EXISTS idx_makers_group ON public.makers(group_slug);

ALTER TABLE public.makers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "makers_select" ON public.makers FOR SELECT USING (true);
CREATE POLICY "makers_insert" ON public.makers FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 3. レビューに maker_id を追加
-- ============================================
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS maker_id UUID REFERENCES public.makers(id) ON DELETE SET NULL;
