-- ユーザーID（@handle）と電話番号をプロフィールに追加

-- ============================================
-- 1. profiles に user_id（ユニーク）と phone を追加
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- ユニーク制約（小文字で一意。重複は不可）
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id_lower
  ON public.profiles (LOWER(user_id))
  WHERE user_id IS NOT NULL;

-- ============================================
-- 2. 新規ユーザー作成時に user_id を meta から設定するようトリガーを更新
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_user_id TEXT;
  meta_display_name TEXT;
BEGIN
  meta_user_id := NEW.raw_user_meta_data->>'user_id';
  IF meta_user_id IS NOT NULL AND meta_user_id <> '' THEN
    meta_user_id := LOWER(TRIM(meta_user_id));
  ELSE
    meta_user_id := NULL;
  END IF;

  meta_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );

  INSERT INTO public.profiles (id, display_name, avatar_url, user_id, phone)
  VALUES (
    NEW.id,
    meta_display_name,
    NEW.raw_user_meta_data->>'avatar_url',
    meta_user_id,
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
