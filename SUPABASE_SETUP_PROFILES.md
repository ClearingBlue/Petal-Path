# Profile System Migration - Setup Steps

## 1. Add Missing Columns to Profiles Table

**IMPORTANT**: Run this first if you already created the profiles table:

```sql
-- Add missing columns to profiles table
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists location text;
```

## 2. Create Avatars Storage Bucket
In your Supabase dashboard:
- Go to **Storage** → **New bucket**
- Name: `avatars`
- Public bucket: **✅ Yes** (checked)
- Click **"Create bucket"**

## 3. Run Storage Policies for Avatars
```sql
-- Allow authenticated users to upload their own avatar
create policy "Users can upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access to avatars
create policy "Public can view avatars" on storage.objects
  for select using (bucket_id = 'avatars');

-- Allow users to update their own avatar
create policy "Users can update own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own avatar
create policy "Users can delete own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

## 4. Update Profiles Table Policies (v2 – Public Read)

> If you already applied the policies from the previous version of this guide, run the **drop** statements first and then the new **create** statements. These policies keep write-operations restricted to the owner, while allowing *any* visitor (even not signed-in) to read the public profile fields so that post authors show up correctly for everyone.

```sql
-- 1) Remove the old policy (if it exists)
drop policy if exists "Users can view all profiles" on public.profiles;

-- 2) Allow EVERYONE (anon + authenticated) to read all profiles
create policy "Public can read profiles" on public.profiles
  for select
  using ( true );

-- 3) Keep owner-only insert / update / delete
-- (drop the old ones first – they may already exist)
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can delete own profile" on public.profiles;

create policy "User can insert own profile" on public.profiles
  for insert
  with check ( auth.uid() = id );

create policy "User can update own profile" on public.profiles
  for update
  using ( auth.uid() = id );

create policy "User can delete own profile" on public.profiles
  for delete
  using ( auth.uid() = id );
```

### Why this upgrade?
* The previous policy only allowed the row owner to read the record, causing other users to see blank avatars / names.
* A fully open `select` policy is safe because profile rows **do not** contain sensitive data after you limit the columns you expose in your UI (e.g. no email address).
* Write operations remain protected – only the profile owner can modify or delete their data.

> **Need stricter privacy?**
> Replace step 2 with `using ( auth.role() = 'authenticated' )` so anonymous visitors cannot read profiles, or create a `VIEW` that exposes only the public columns and open the policy on that view instead of the base table.

## 5. Test the Profile System
1. **Login** to your app
2. **Go to Settings** (gear icon in profile)
3. **Update your profile** information
4. **Upload an avatar** image
5. **Check the profile view** to see your changes

## What's Changed
- ✅ Profile data now loads from Supabase `profiles` table
- ✅ Settings page saves to database instead of cache
- ✅ Avatar upload works with Supabase Storage
- ✅ Username availability checking
- ✅ New users get auto-created profiles
- ✅ Profile view shows real data (blank for new users)
- ✅ Settings allow full profile customization

## Next Steps
- Filter posts by current user in profile view
- Add user info to posts display
- Implement user search and following system 