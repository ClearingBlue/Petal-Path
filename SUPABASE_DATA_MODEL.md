# Supabase Database & Storage Blueprint

This document grows as backend integration progresses. Follow the DDL (SQL) blocks in order and run them in the Supabase SQL editor *after you create the project*.

---

## 1. `profiles` table
Supabase Auth creates the `auth.users` table. We extend it with a 1-to-1 `profiles` table for public information.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  location text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can manage own profile" on public.profiles
  for all using ( auth.uid() = id );
create policy "Users can view all profiles" on public.profiles
  for select using ( true );
```

---

## 2. `locations` table
```sql
create table public.locations (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  image_url text,
  address text,
  lat double precision not null,
  lng double precision not null,
  category text,
  rating numeric(3,2) default 0,
  visit_count int default 0,
  tags text[],
  created_at timestamptz default now()
);
```

Storage: Create a **`locations`** bucket in Supabase Storage (public read) for images.

---

## 3. `posts` & `post_images` tables
```sql
create table public.posts (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  location_id bigint references public.locations(id) on delete set null,
  title text not null,
  description text,
  tags text[],
  likes int default 0,
  created_at timestamptz default now()
);

alter table public.posts enable row level security;
create policy "Users can manage own posts" on public.posts
  for all using ( auth.uid() = user_id );
create policy "Users can view all posts" on public.posts
  for select using ( true );

create table public.post_images (
  id bigint generated always as identity primary key,
  post_id bigint references public.posts(id) on delete cascade,
  url text not null
);

alter table public.post_images enable row level security;
create policy "Users can view all post images" on public.post_images
  for select using ( true );
create policy "Users can manage own post images" on public.post_images
  for all using ( 
    exists (
      select 1 from public.posts 
      where posts.id = post_images.post_id 
      and posts.user_id = auth.uid()
    )
  );
```

Storage: Create a **`posts`** bucket (public read) for user-uploaded images.

---

## 4. `comments`
```sql
create table public.comments (
  id bigint generated always as identity primary key,
  post_id bigint references public.posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table public.comments enable row level security;
create policy "Users can read comments"   on public.comments for select using ( true );
create policy "Users can manage own"      on public.comments for all    using ( auth.uid() = user_id );
```

---

## 5. `post_likes` table
```sql
create table public.post_likes (
  id bigint generated always as identity primary key,
  post_id bigint references public.posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.post_likes enable row level security;
create policy "Users can read likes"      on public.post_likes for select using ( true );
create policy "Users can manage own"      on public.post_likes for all    using ( auth.uid() = user_id );
```

---

## 6. `follows` table (User Follow/Subscription System)
```sql
create table public.follows (
  id bigint generated always as identity primary key,
  follower_id uuid references auth.users(id) on delete cascade,
  following_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, following_id),
  check (follower_id != following_id)
);

alter table public.follows enable row level security;
create policy "Users can view all follows" on public.follows 
  for select using ( true );
create policy "Users can manage own follows" on public.follows 
  for all using ( auth.uid() = follower_id );

-- Create indexes for better performance
create index idx_follows_follower on public.follows(follower_id);
create index idx_follows_following on public.follows(following_id);

-- Create a function to get follower/following counts
create or replace function get_user_stats(user_id uuid)
returns table(followers_count bigint, following_count bigint, posts_count bigint)
language sql
security definer
as $$
  select 
    (select count(*) from public.follows where following_id = user_id) as followers_count,
    (select count(*) from public.follows where follower_id = user_id) as following_count,
    (select count(*) from public.posts where posts.user_id = user_id) as posts_count;
$$;
```

---

## 7. Messaging (future)
```sql
create table public.messages (
  id bigint generated always as identity primary key,
  from_id uuid references auth.users(id) on delete cascade,
  to_id   uuid references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;
create policy "Only participants access" on public.messages
  for all using ( auth.uid() = from_id or auth.uid() = to_id );
```

---

## 8. Indexes & performance
Add indexes as usage patterns emerge (e.g. `create index on posts (location_id)`).

---

## 9. Storage bucket CORS
For local dev, enable CORS: `http://localhost:3002` and production domains.

---

## 10. Additional Useful Functions

### Get user feed (posts from followed users)
```sql
create or replace function get_user_feed(user_id uuid, limit_count int default 20)
returns table(
  post_id bigint,
  title text,
  description text,
  tags text[],
  created_at timestamptz,
  user_id uuid,
  location_id bigint
)
language sql
security definer
as $$
  select 
    p.id as post_id,
    p.title,
    p.description,
    p.tags,
    p.created_at,
    p.user_id,
    p.location_id
  from public.posts p
  inner join public.follows f on f.following_id = p.user_id
  where f.follower_id = user_id
  order by p.created_at desc
  limit limit_count;
$$;
```

### Check if user is following another user
```sql
create or replace function is_following(follower_id uuid, following_id uuid)
returns boolean
language sql
security definer
as $$
  select exists(
    select 1 from public.follows 
    where follows.follower_id = is_following.follower_id 
    and follows.following_id = is_following.following_id
  );
$$;
``` 