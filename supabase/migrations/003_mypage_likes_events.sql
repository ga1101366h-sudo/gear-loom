-- マイページ用: 自己紹介(bio)、レビューいいね、ライブ予定

-- ============================================
-- 1. プロフィールに自己紹介欄を追加
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- ============================================
-- 2. レビューいいね（誰がどのレビューにいいねしたか）
-- ============================================
CREATE TABLE IF NOT EXISTS public.review_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, review_id)
);

CREATE INDEX IF NOT EXISTS idx_review_likes_review ON public.review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user ON public.review_likes(user_id);

ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_likes_select" ON public.review_likes FOR SELECT USING (true);
CREATE POLICY "review_likes_insert" ON public.review_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "review_likes_delete" ON public.review_likes FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. ライブ予定（登録ユーザーが設定する予定）
-- ============================================
CREATE TABLE IF NOT EXISTS public.live_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  venue TEXT,
  description TEXT,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_events_user ON public.live_events(user_id);
CREATE INDEX IF NOT EXISTS idx_live_events_date ON public.live_events(event_date);

ALTER TABLE public.live_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_events_select" ON public.live_events FOR SELECT USING (true);
CREATE POLICY "live_events_insert" ON public.live_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "live_events_update" ON public.live_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "live_events_delete" ON public.live_events FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER live_events_updated_at BEFORE UPDATE ON public.live_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
