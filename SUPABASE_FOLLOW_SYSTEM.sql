-- =====================================================
-- PetalPath Follow System - Complete SQL Setup
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Create the follows table
CREATE TABLE IF NOT EXISTS public.follows (
  id bigint generated always as identity primary key,
  follower_id uuid references auth.users(id) on delete cascade,
  following_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, following_id),
  check (follower_id != following_id)
);

-- 2. Enable Row Level Security
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for follows table
CREATE POLICY "Users can view all follows" ON public.follows 
  FOR SELECT USING ( true );

CREATE POLICY "Users can manage own follows" ON public.follows 
  FOR ALL USING ( auth.uid() = follower_id );

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- 5. Create function to get user statistics (followers, following, posts count)
CREATE OR REPLACE FUNCTION get_user_stats(user_id uuid)
RETURNS TABLE(followers_count bigint, following_count bigint, posts_count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    (SELECT count(*) FROM public.follows WHERE following_id = user_id) as followers_count,
    (SELECT count(*) FROM public.follows WHERE follower_id = user_id) as following_count,
    (SELECT count(*) FROM public.posts WHERE posts.user_id = user_id) as posts_count;
$$;

-- 6. Create function to check if user is following another user
CREATE OR REPLACE FUNCTION is_following(follower_id uuid, following_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT exists(
    SELECT 1 FROM public.follows 
    WHERE follows.follower_id = is_following.follower_id 
    AND follows.following_id = is_following.following_id
  );
$$;

-- 7. Create function to get user feed (posts from followed users)
CREATE OR REPLACE FUNCTION get_user_feed(user_id uuid, limit_count int default 20)
RETURNS TABLE(
  post_id bigint,
  title text,
  description text,
  tags text[],
  created_at timestamptz,
  user_id uuid,
  location_id bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id as post_id,
    p.title,
    p.description,
    p.tags,
    p.created_at,
    p.user_id,
    p.location_id
  FROM public.posts p
  INNER JOIN public.follows f ON f.following_id = p.user_id
  WHERE f.follower_id = user_id
  ORDER BY p.created_at DESC
  LIMIT limit_count;
$$;

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.follows TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_following(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_feed(uuid, int) TO anon, authenticated;

-- =====================================================
-- Verification Queries (Optional - for testing)
-- =====================================================

-- Check if follows table was created successfully
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'follows';

-- Check if indexes were created
-- SELECT indexname FROM pg_indexes WHERE tablename = 'follows';

-- Check if functions were created
-- SELECT routine_name FROM information_schema.routines WHERE routine_name IN ('get_user_stats', 'is_following', 'get_user_feed');

-- =====================================================
-- Notes:
-- =====================================================
-- 1. This assumes you already have the basic tables (profiles, posts, etc.) from SUPABASE_DATA_MODEL.md
-- 2. The follows table prevents self-following with a check constraint
-- 3. The unique constraint prevents duplicate follow relationships
-- 4. RLS policies ensure users can only manage their own follows but can view all follows
-- 5. Indexes improve performance for follower/following lookups
-- 6. Functions provide efficient ways to get user stats and feeds
-- ===================================================== 