-- PetalPath Saved Locations Extension
-- Minimal addition to support location bookmarks/favorites using similar pattern to post_likes

-- 1. Create saved_locations table similar to post_likes pattern
CREATE TABLE public.saved_locations (
  id bigint generated always as identity primary key,
  location_id bigint references public.locations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(location_id, user_id)
);

-- 2. Enable RLS and create policies
ALTER TABLE public.saved_locations enable row level security;

CREATE POLICY "Users can read saved locations" ON public.saved_locations
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own saved locations" ON public.saved_locations
  FOR ALL USING (auth.uid() = user_id);

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_saved_locations_user ON public.saved_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_locations_location ON public.saved_locations(location_id); 