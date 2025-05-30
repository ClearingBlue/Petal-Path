-- PetalPath Reports System for Content Moderation
-- Simple table to store post reports for manual moderation

-- 1. Create reports table
CREATE TABLE public.reports (
  id bigint generated always as identity primary key,
  post_id bigint references public.posts(id) on delete cascade,
  reported_by uuid references auth.users(id) on delete cascade,
  reason text not null,
  additional_info text,
  status text default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  
  -- Prevent duplicate reports from same user for same post
  unique(post_id, reported_by)
);

-- 2. Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can only see their own reports
CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT USING (auth.uid() = reported_by);

-- Users can create reports
CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reported_by);

-- Admin policy (you'll need to set up admin role separately)
-- CREATE POLICY "Admins can view all reports" ON public.reports
--   FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- 4. Create index for performance
CREATE INDEX idx_reports_post_id ON public.reports(post_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_created_at ON public.reports(created_at desc); 