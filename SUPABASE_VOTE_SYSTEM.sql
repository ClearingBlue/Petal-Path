-- PetalPath Enhanced Voting & Ranking System
-- This extends the existing post_likes table to support downvotes and implements feed ranking

-- 1. Add a vote_type column to the existing post_likes table
-- This allows us to track both upvotes (likes) and downvotes using the same table
ALTER TABLE public.post_likes 
ADD COLUMN vote_type text NOT NULL DEFAULT 'up' CHECK (vote_type IN ('up', 'down'));

-- Update the unique constraint to allow one vote per user per post (but they can change the vote type)
-- First drop the existing constraint, then add the new one
ALTER TABLE public.post_likes 
DROP CONSTRAINT IF EXISTS post_likes_post_id_user_id_key;

ALTER TABLE public.post_likes 
ADD CONSTRAINT post_likes_post_id_user_id_unique UNIQUE(post_id, user_id);

-- 2. Create a function to calculate post score (upvotes - downvotes)
CREATE OR REPLACE FUNCTION calculate_post_score(post_id_param bigint)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT 
    COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 WHEN vote_type = 'down' THEN -1 ELSE 0 END), 0)::integer
  FROM public.post_likes 
  WHERE post_id = post_id_param;
$$;

-- 3. Create a view for post rankings that combines score with recency
CREATE OR REPLACE VIEW public.post_rankings AS
SELECT 
  p.id,
  p.created_at,
  calculate_post_score(p.id) as score,
  -- Calculate a ranking score that balances popularity with recency
  -- Higher score = better ranking. Recent posts get a boost.
  calculate_post_score(p.id) + 
    CASE 
      WHEN p.created_at > NOW() - INTERVAL '1 day' THEN 5
      WHEN p.created_at > NOW() - INTERVAL '3 days' THEN 3
      WHEN p.created_at > NOW() - INTERVAL '7 days' THEN 1
      ELSE 0
    END as ranking_score
FROM public.posts p;

-- 4. Create an index for better performance on post rankings
CREATE INDEX IF NOT EXISTS idx_post_likes_post_vote ON public.post_likes(post_id, vote_type);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- 5. Helper function to get vote counts for multiple posts
CREATE OR REPLACE FUNCTION get_post_vote_counts(post_ids bigint[])
RETURNS TABLE(
  post_id bigint,
  upvotes bigint,
  downvotes bigint,
  score bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    p.id as post_id,
    COALESCE(up_votes.count, 0) as upvotes,
    COALESCE(down_votes.count, 0) as downvotes,
    COALESCE(up_votes.count, 0) - COALESCE(down_votes.count, 0) as score
  FROM unnest(post_ids) as p(id)
  LEFT JOIN (
    SELECT post_id, COUNT(*) as count
    FROM public.post_likes 
    WHERE vote_type = 'up' AND post_id = ANY(post_ids)
    GROUP BY post_id
  ) up_votes ON up_votes.post_id = p.id
  LEFT JOIN (
    SELECT post_id, COUNT(*) as count
    FROM public.post_likes 
    WHERE vote_type = 'down' AND post_id = ANY(post_ids)
    GROUP BY post_id
  ) down_votes ON down_votes.post_id = p.id;
$$;

-- 6. Function to get user's votes for multiple posts
CREATE OR REPLACE FUNCTION get_user_votes(user_id_param uuid, post_ids bigint[])
RETURNS TABLE(
  post_id bigint,
  vote_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT post_id, vote_type
  FROM public.post_likes
  WHERE user_id = user_id_param AND post_id = ANY(post_ids);
$$;

-- 7. Enhanced feed function with ranking
CREATE OR REPLACE FUNCTION get_ranked_feed(limit_count int DEFAULT 20)
RETURNS TABLE(
  post_id bigint,
  title text,
  description text,
  tags text[],
  created_at timestamptz,
  user_id uuid,
  location_id bigint,
  score integer,
  ranking_score numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    p.id as post_id,
    p.title,
    p.description,
    p.tags,
    p.created_at,
    p.user_id,
    p.location_id,
    pr.score,
    pr.ranking_score
  FROM public.posts p
  JOIN public.post_rankings pr ON pr.id = p.id
  ORDER BY pr.ranking_score DESC, p.created_at DESC
  LIMIT limit_count;
$$;

-- 8. Update RLS policies for the modified post_likes table
-- The existing policies should work, but let's make sure they're comprehensive
DROP POLICY IF EXISTS "Users can read likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can manage own" ON public.post_likes;

CREATE POLICY "Users can read all votes" ON public.post_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own votes" ON public.post_likes
  FOR ALL USING (auth.uid() = user_id); 