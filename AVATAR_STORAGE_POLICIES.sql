-- Avatar Storage Bucket RLS Policies
-- This script sets up the necessary policies for users to manage their avatar uploads

-- 1. Allow users to upload their own avatars (INSERT)
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 2. Allow users to update their own avatars (UPDATE) - needed for upsert
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Allow users to delete their own avatars (DELETE)
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Allow public to view avatars (SELECT) - since avatars are public
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Note: These policies assume avatar filenames start with the user ID
-- e.g., "userId_timestamp.jpg"
-- The policies check that the first part of the filename matches the authenticated user's ID 