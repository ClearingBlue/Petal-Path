-- Add missing RPC functions for post rankings

-- Function to get enhanced rankings for specific posts
CREATE OR REPLACE FUNCTION get_post_enhanced_rankings(post_ids integer[])
RETURNS TABLE(
  post_id integer,
  vote_score integer,
  comment_score integer,
  total_base_score integer,
  ranking_score numeric,
  time_decay_factor numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id as post_id,
    COALESCE((
      SELECT COUNT(*) FILTER (WHERE vote_type = 'up') - COUNT(*) FILTER (WHERE vote_type = 'down')
      FROM post_likes 
      WHERE post_id = p.id
    ), 0) as vote_score,
    COALESCE((
      SELECT COUNT(*) * 2 
      FROM comments 
      WHERE post_id = p.id
    ), 0) as comment_score,
    COALESCE((
      SELECT COUNT(*) FILTER (WHERE vote_type = 'up') - COUNT(*) FILTER (WHERE vote_type = 'down')
      FROM post_likes 
      WHERE post_id = p.id
    ), 0) + COALESCE((
      SELECT COUNT(*) * 2 
      FROM comments 
      WHERE post_id = p.id
    ), 0) as total_base_score,
    -- Simple ranking calculation
    (COALESCE((
      SELECT COUNT(*) FILTER (WHERE vote_type = 'up') - COUNT(*) FILTER (WHERE vote_type = 'down')
      FROM post_likes 
      WHERE post_id = p.id
    ), 0) + COALESCE((
      SELECT COUNT(*) * 2 
      FROM comments 
      WHERE post_id = p.id
    ), 0)) * 
    GREATEST(0.1, 1.0 - (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400 / 7)) as ranking_score,
    GREATEST(0.1, 1.0 - (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400 / 7)) as time_decay_factor
  FROM posts p
  WHERE p.id = ANY(post_ids);
$$;

-- Function to get enhanced ranked feed
CREATE OR REPLACE FUNCTION get_enhanced_ranked_feed(limit_count integer DEFAULT 50)
RETURNS TABLE(
  post_id integer,
  ranking_score numeric,
  vote_score integer,
  comment_score integer
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id as post_id,
    -- Calculate ranking score with time decay
    (COALESCE((
      SELECT COUNT(*) FILTER (WHERE vote_type = 'up') - COUNT(*) FILTER (WHERE vote_type = 'down')
      FROM post_likes 
      WHERE post_id = p.id
    ), 0) + COALESCE((
      SELECT COUNT(*) * 2 
      FROM comments 
      WHERE post_id = p.id
    ), 0)) * 
    GREATEST(0.1, 1.0 - (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400 / 7)) as ranking_score,
    COALESCE((
      SELECT COUNT(*) FILTER (WHERE vote_type = 'up') - COUNT(*) FILTER (WHERE vote_type = 'down')
      FROM post_likes 
      WHERE post_id = p.id
    ), 0) as vote_score,
    COALESCE((
      SELECT COUNT(*) * 2 
      FROM comments 
      WHERE post_id = p.id
    ), 0) as comment_score
  FROM posts p
  ORDER BY ranking_score DESC, p.created_at DESC
  LIMIT limit_count;
$$;

-- Function to get vote counts for posts
CREATE OR REPLACE FUNCTION get_post_vote_counts(post_ids integer[])
RETURNS TABLE(
  post_id integer,
  upvotes integer,
  downvotes integer,
  score integer
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id as post_id,
    COALESCE(COUNT(*) FILTER (WHERE pl.vote_type = 'up'), 0) as upvotes,
    COALESCE(COUNT(*) FILTER (WHERE pl.vote_type = 'down'), 0) as downvotes,
    COALESCE(COUNT(*) FILTER (WHERE pl.vote_type = 'up'), 0) - 
    COALESCE(COUNT(*) FILTER (WHERE pl.vote_type = 'down'), 0) as score
  FROM posts p
  LEFT JOIN post_likes pl ON p.id = pl.post_id
  WHERE p.id = ANY(post_ids)
  GROUP BY p.id;
$$;

-- Function to get user votes for posts
CREATE OR REPLACE FUNCTION get_user_votes(user_id_param uuid, post_ids integer[])
RETURNS TABLE(
  post_id integer,
  vote_type text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    post_id,
    vote_type
  FROM post_likes
  WHERE user_id = user_id_param
  AND post_id = ANY(post_ids);
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_post_enhanced_rankings(integer[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_enhanced_ranked_feed(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_post_vote_counts(integer[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_votes(uuid, integer[]) TO anon, authenticated; 