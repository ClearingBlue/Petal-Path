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
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can manage own profile" on public.profiles
  for all using ( auth.uid() = id );
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

create table public.post_images (
  id bigint generated always as identity primary key,
  post_id bigint references public.posts(id) on delete cascade,
  url text not null
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

## 5. Messaging (future)
```
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

## 6. Indexes & performance
Add indexes as usage patterns emerge (e.g. `create index on posts (location_id)`).

---

## 7. Storage bucket CORS
For local dev, enable CORS: `http://localhost:3002` and production domains.

---

> Keep this file open during development; append new DDL blocks when new tables, functions or policies are required. 