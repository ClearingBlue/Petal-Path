# Full System Cleanup Report

## 🚨 Critical Issue: Post Images Storage

### Problem
Post images are being stored as base64 data URLs directly in the `post_images` table instead of being uploaded to Supabase Storage. This is why images "disappeared" - they were never properly stored.

### Current Flow
1. User selects images in `/app/create/page.tsx`
2. Images are converted to base64 data URLs
3. These data URLs are passed to `createPost()` 
4. The URLs are inserted directly into `post_images.url` column

### Solution Needed
- Create a `posts` bucket in Supabase Storage
- Implement proper image upload to storage before creating post
- Store only the public URLs in the database

## 📁 Mock Data Still Present

### Files Using Mock Data
1. **Test files** (OK to keep):
   - `src/__tests__/*.test.tsx`

2. **Old data models** (should be removed):
   - `/lib/data/models/*.ts` - All mock data files
   - `/lib/data/services/*.ts` - All old service files using mock data
   - `/lib/data/init-data.ts` - Mock data initialization
   - `/lib/data/index.ts` - Exports mock data

3. **Components importing old models**:
   - `components/profile-view.tsx` - imports from `/lib/data/models/`
   - `components/map-view.tsx` - imports from `/lib/data/models/`
   - `components/location-map.tsx` - imports from `/lib/data/models/`
   - `app/post/[id]/page.tsx` - imports from `/lib/data/models/`
   - `app/location/[id]/page.tsx` - imports from `/lib/data/models/`
   - `app/create/page.tsx` - imports from `/lib/data/models/`

## 🗄️ Database Tables Review

### Tables to Keep
- `profiles` ✅
- `locations` ✅
- `posts` ✅
- `post_images` ✅ (but needs proper image URLs)
- `comments` ✅
- `post_likes` ✅ (with vote_type for up/down votes)
- `follows` ✅
- `messages` ✅
- `comment_likes` ✅
- `user_saved_locations` ✅
- `user_location_visits` ✅
- `reports` ✅

### Tables that Might Need Removal
- `enhanced_post_rankings_cache` - Still referenced in code but we tried to remove dependency

### RPC Functions to Keep
- `get_user_stats` ✅
- `get_enhanced_ranked_feed` ✅
- `get_post_enhanced_rankings` ✅
- `get_post_vote_counts` ✅
- `get_user_votes` ✅
- `is_following` ✅
- `get_user_feed` ✅

## 🚀 Performance Issues

### Current Problems
1. **No real image storage** - Base64 strings in database are huge and slow
2. **sessionStorage cache not optimal** - Still making too many API calls
3. **Old mock data imports** - Even though disabled, they're still loaded in bundle

### Solutions for Next Steps
1. **Implement proper image upload**:
   ```typescript
   // Upload to Supabase Storage
   const { data, error } = await supabase.storage
     .from('posts')
     .upload(`${userId}/${postId}/${filename}`, file)
   ```

2. **Use React Query or SWR** for proper client-side caching
3. **Remove all `/lib/data/` directory**
4. **Create proper TypeScript interfaces** in a new location

## 📝 Files to Delete

```
/lib/data/              # Entire directory
/lib/cache.ts           # Old cache system
CHECK_DB_STATUS.sql     # Empty file
```

## 🔧 Required Actions

### Immediate (Breaking Issues)
1. **Fix Image Upload**:
   - Create `posts` storage bucket in Supabase
   - Update `createPost` to upload images first
   - Store only public URLs in database

2. **Clean Imports**:
   - Replace all imports from `/lib/data/models/` with proper interfaces
   - Delete the entire `/lib/data/` directory

### Performance Improvements
1. Replace sessionStorage with React Query/SWR
2. Implement proper image optimization (resize, compress)
3. Add pagination to post feeds

## 💾 Storage Buckets Needed

```sql
-- Create posts bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('posts', 'posts', true);

-- Create proper bucket policies
CREATE POLICY "Users can upload own post images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view post images" ON storage.objects
FOR SELECT USING (bucket_id = 'posts');
```

## 🗑️ Data Cleanup

If you have posts with base64 images in the database:
1. They're not recoverable as proper images
2. You'll need to delete these posts or convert the base64 back to files and re-upload

```sql
-- Check how many posts have base64 images
SELECT COUNT(*) FROM post_images 
WHERE url LIKE 'data:image%';

-- If you want to delete them
DELETE FROM posts 
WHERE id IN (
  SELECT DISTINCT post_id 
  FROM post_images 
  WHERE url LIKE 'data:image%'
);
``` 