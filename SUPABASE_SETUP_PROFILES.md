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

## 4. Update Profiles Table Policies (if needed)
```sql
-- Update profiles table policies to allow public read
drop policy if exists "Users can manage own profile" on public.profiles;
create policy "Users can view all profiles" on public.profiles
  for select using ( true );
create policy "Users can insert own profile" on public.profiles
  for insert with check ( auth.uid() = id );
create policy "Users can update own profile" on public.profiles
  for update using ( auth.uid() = id );
create policy "Users can delete own profile" on public.profiles
  for delete using ( auth.uid() = id );
```

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