-- PetalPath Comment Likes Extension
-- Minimal addition to support comment likes using similar pattern to post_likes

-- 1. Create comment_likes table similar to post_likes
CREATE TABLE public.comment_likes (
  id bigint generated always as identity primary key,
  comment_id bigint references public.comments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(comment_id, user_id)
);

-- 2. Enable RLS and create policies
ALTER TABLE public.comment_likes enable row level security;

CREATE POLICY "Users can read comment likes" ON public.comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own comment likes" ON public.comment_likes
  FOR ALL USING (auth.uid() = user_id);

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_user ON public.comment_likes(comment_id, user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON public.comment_likes(comment_id); 