-- PetalPath Location Visits Extension
-- Minimal addition to track user visits to locations when they post

-- 1. Create location_visits table to track individual user visits
CREATE TABLE public.location_visits (
  id bigint generated always as identity primary key,
  location_id bigint references public.locations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  visit_count int default 1,
  last_visit_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(location_id, user_id)
);

-- 2. Enable RLS and create policies
ALTER TABLE public.location_visits enable row level security;

CREATE POLICY "Users can read location visits" ON public.location_visits
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own location visits" ON public.location_visits
  FOR ALL USING (auth.uid() = user_id);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_location_visits_user ON public.location_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_location_visits_location ON public.location_visits(location_id); 