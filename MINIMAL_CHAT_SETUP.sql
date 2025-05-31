-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id bigint generated always as identity primary key,
  user1_id uuid not null references public.profiles(id) on delete cascade,
  user2_id uuid not null references public.profiles(id) on delete cascade,
  user1_last_seen timestamptz default now(),
  user2_last_seen timestamptz default now(),
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  constraint conversations_unique unique (user1_id, user2_id)
);

-- Create messages table  
CREATE TABLE IF NOT EXISTS public.messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Simple policies
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can view messages in own conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = messages.conversation_id 
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Performance optimizations for ranking system
-- Create materialized view for enhanced post rankings (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.enhanced_post_rankings_cache AS
SELECT 
  p.id,
  p.created_at,
  p.user_id,
  p.location_id,
  calculate_post_score(p.id) as vote_score,
  get_post_comment_score(p.id) as comment_score,
  calculate_post_score(p.id) + get_post_comment_score(p.id) as total_base_score,
  calculate_enhanced_ranking_score(p.id, p.created_at) as ranking_score
FROM public.posts p;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enhanced_rankings_score ON public.enhanced_post_rankings_cache(ranking_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enhanced_rankings_user ON public.enhanced_post_rankings_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_rankings_location ON public.enhanced_post_rankings_cache(location_id);

-- Function to refresh rankings cache (call this periodically)
CREATE OR REPLACE FUNCTION refresh_rankings_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.enhanced_post_rankings_cache;
$$; 