-- Script to identify and clean up base64 images in the database

-- 1. Check how many posts have base64 images
SELECT COUNT(DISTINCT post_id) as affected_posts_count,
       COUNT(*) as total_base64_images
FROM post_images 
WHERE url LIKE 'data:image%';

-- 2. Get list of affected posts with their details
SELECT p.id, p.title, p.created_at, p.user_id, 
       COUNT(pi.id) as base64_image_count
FROM posts p
INNER JOIN post_images pi ON pi.post_id = p.id
WHERE pi.url LIKE 'data:image%'
GROUP BY p.id, p.title, p.created_at, p.user_id
ORDER BY p.created_at DESC;

-- 3. OPTIONAL: Delete all posts with base64 images
-- UNCOMMENT TO RUN:
-- DELETE FROM posts 
-- WHERE id IN (
--   SELECT DISTINCT post_id 
--   FROM post_images 
--   WHERE url LIKE 'data:image%'
-- );

-- 4. OPTIONAL: Delete only the base64 images, keeping the posts
-- UNCOMMENT TO RUN:
-- DELETE FROM post_images
-- WHERE url LIKE 'data:image%';

-- 5. Verify cleanup
-- SELECT COUNT(*) as remaining_base64_images
-- FROM post_images 
-- WHERE url LIKE 'data:image%'; 