-- PetalPath Enhanced Ranking Algorithm with Comment Points & Logarithmic Time Decay
-- This upgrades the ranking system to include comment scoring and more sophisticated time decay

-- 1. Create a function to get comment count for a post (each comment = 2 points)
CREATE OR REPLACE FUNCTION get_post_comment_score(post_id_param bigint)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(COUNT(*), 0)::integer * 2
  FROM public.comments 
  WHERE post_id = post_id_param;
$$;

-- 2. Enhanced ranking algorithm with logarithmic time decay
-- Formula: (upvotes - downvotes + 2*comments) * log_decay_factor
-- The log decay prevents posts from dropping too quickly while still favoring recent content
CREATE OR REPLACE FUNCTION calculate_enhanced_ranking_score(post_id_param bigint, created_at_param timestamptz)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT 
    -- Base score: vote score + comment score
    (calculate_post_score(post_id_param) + get_post_comment_score(post_id_param)) *
    -- Logarithmic time decay factor
    -- Uses natural log of hours + 1 to prevent division by zero
    -- The 24.0 divisor controls decay rate (higher = faster decay)
    (1.0 / (1.0 + LN(GREATEST(1.0, EXTRACT(EPOCH FROM (NOW() - created_at_param)) / 3600.0)) / 24.0))
$$;

-- 3. Create enhanced post rankings view with new algorithm
CREATE OR REPLACE VIEW public.enhanced_post_rankings AS
SELECT 
  p.id,
  p.created_at,
  calculate_post_score(p.id) as vote_score,
  get_post_comment_score(p.id) as comment_score,
  calculate_post_score(p.id) + get_post_comment_score(p.id) as total_base_score,
  calculate_enhanced_ranking_score(p.id, p.created_at) as ranking_score,
  -- Include time factor for debugging/analysis
  (1.0 / (1.0 + LN(GREATEST(1.0, EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0)) / 24.0)) as time_decay_factor,
  EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0 as hours_old
FROM public.posts p;

-- 4. Enhanced feed function with new ranking algorithm
CREATE OR REPLACE FUNCTION get_enhanced_ranked_feed(limit_count int DEFAULT 20)
RETURNS TABLE(
  post_id bigint,
  title text,
  description text,
  tags text[],
  created_at timestamptz,
  user_id uuid,
  location_id bigint,
  vote_score integer,
  comment_score integer,
  total_base_score integer,
  ranking_score numeric,
  time_decay_factor numeric
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
    epr.vote_score,
    epr.comment_score,
    epr.total_base_score,
    epr.ranking_score,
    epr.time_decay_factor
  FROM public.posts p
  JOIN public.enhanced_post_rankings epr ON epr.id = p.id
  ORDER BY epr.ranking_score DESC, p.created_at DESC
  LIMIT limit_count;
$$;

-- 5. Function to get enhanced ranking data for multiple posts (for batch operations)
CREATE OR REPLACE FUNCTION get_enhanced_post_rankings(post_ids bigint[])
RETURNS TABLE(
  post_id bigint,
  vote_score integer,
  comment_score integer,
  total_base_score integer,
  ranking_score numeric,
  time_decay_factor numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    epr.id as post_id,
    epr.vote_score,
    epr.comment_score,
    epr.total_base_score,
    epr.ranking_score,
    epr.time_decay_factor
  FROM public.enhanced_post_rankings epr
  WHERE epr.id = ANY(post_ids)
  ORDER BY epr.ranking_score DESC;
$$;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);

-- 7. Optional: Function to analyze ranking distribution (useful for tuning)
CREATE OR REPLACE FUNCTION analyze_ranking_distribution()
RETURNS TABLE(
  percentile text,
  ranking_score numeric,
  vote_score integer,
  comment_score integer,
  hours_old numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    percentile_text,
    PERCENTILE_CONT(percentile_value) WITHIN GROUP (ORDER BY epr.ranking_score) as ranking_score,
    PERCENTILE_CONT(percentile_value) WITHIN GROUP (ORDER BY epr.vote_score) as vote_score,
    PERCENTILE_CONT(percentile_value) WITHIN GROUP (ORDER BY epr.comment_score) as comment_score,
    PERCENTILE_CONT(percentile_value) WITHIN GROUP (ORDER BY epr.hours_old) as hours_old
  FROM public.enhanced_post_rankings epr,
  (VALUES 
    ('25th', 0.25),
    ('50th', 0.50), 
    ('75th', 0.75),
    ('90th', 0.90),
    ('95th', 0.95)
  ) AS percentiles(percentile_text, percentile_value)
  GROUP BY percentile_text, percentile_value
  ORDER BY percentile_value;
$$;

-- 8. Update the original get_ranked_feed to use enhanced ranking (for backwards compatibility)
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
    epr.total_base_score as score, -- Use total_base_score for backwards compatibility
    epr.ranking_score
  FROM public.posts p
  JOIN public.enhanced_post_rankings epr ON epr.id = p.id
  ORDER BY epr.ranking_score DESC, p.created_at DESC
  LIMIT limit_count;
$$;

-- 9. Replace the old post_rankings view to use enhanced ranking
DROP VIEW IF EXISTS public.post_rankings;
CREATE VIEW public.post_rankings AS
SELECT 
  id,
  created_at,
  total_base_score as score,
  ranking_score
FROM public.enhanced_post_rankings; 