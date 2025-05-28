# PetalPath Voting System Upgrade

## Overview

The PetalPath feed has been upgraded from a simple chronological timeline to an intelligent ranking system that supports both upvotes and downvotes. This creates a more engaging social experience similar to Reddit, where quality content rises to the top.

## What Changed

### 🔄 **From Simple Likes to Upvote/Downvote System**
- **Before**: Posts only had "likes" (positive reactions)
- **After**: Posts support both upvotes (👍) and downvotes (👎)
- **Net Score**: Display shows `upvotes - downvotes` 
- **Visual Feedback**: Positive scores are green, negative scores are red

### 📈 **Intelligent Feed Ranking**
- **Before**: Posts sorted by creation time only
- **After**: Posts ranked by popularity + recency
- **Algorithm**: `score + recency_boost` where:
  - `score = upvotes - downvotes`
  - Recent posts (1 day) get +5 boost
  - Posts 1-3 days old get +3 boost  
  - Posts 3-7 days old get +1 boost

## Database Changes

### 📊 **Enhanced `post_likes` Table**
```sql
-- Added vote_type column to existing table
ALTER TABLE public.post_likes 
ADD COLUMN vote_type text NOT NULL DEFAULT 'up' CHECK (vote_type IN ('up', 'down'));
```

### 🔧 **New Database Functions**
- `calculate_post_score(post_id)` - Calculates net score for a post
- `get_post_vote_counts(post_ids[])` - Batch fetch vote counts  
- `get_user_votes(user_id, post_ids[])` - Get user's votes for posts
- `get_ranked_feed(limit)` - Returns posts sorted by ranking algorithm

### 📈 **Performance Optimizations**
- New indexes on `(post_id, vote_type)` and `created_at`
- Batch queries to minimize database calls
- Efficient ranking calculations

## Frontend Changes

### 🎨 **Enhanced UI Components**
- **Vote Buttons**: Clear upvote (green) and downvote (red) states
- **Score Display**: Color-coded based on positive/negative score
- **Real-time Updates**: Immediate UI feedback when voting

### ⚡ **Improved User Experience**
- **Smart Voting**: Click same vote to remove it, click opposite to change vote
- **Fallback Support**: Graceful degradation if ranking service fails
- **Backwards Compatibility**: All existing functions still work

## Deployment Instructions

### 1. **Run Database Migration**
Execute the SQL commands in `SUPABASE_VOTE_SYSTEM.sql` in your Supabase SQL editor:

```bash
# Copy and paste the entire SUPABASE_VOTE_SYSTEM.sql file
# into your Supabase project's SQL editor and run it
```

### 2. **Deploy Application Code** 
The frontend code is already updated and backwards-compatible:

```bash
pnpm build
pnpm start
```

### 3. **Verify Deployment**
- ✅ Users can upvote and downvote posts
- ✅ Scores update in real-time  
- ✅ Feed shows highest-scored recent content first
- ✅ Fallback to chronological if ranking fails

## User Behavior Impact

### 📊 **Expected Outcomes**
1. **Higher Engagement**: Users interact more with voting system
2. **Quality Content**: Best posts naturally rise to top of feed
3. **Recent Content Boost**: New posts get visibility despite low score
4. **Community Moderation**: Poor content gets downvoted and hidden

### 🎯 **Key Metrics to Monitor**
- Post engagement rates (votes per post)
- Time spent in feed (should increase)
- Content quality (subjective, but look for trends)
- User retention and session duration

## Technical Implementation Details

### 🔧 **Database Schema**
```sql
-- Enhanced post_likes table
CREATE TABLE post_likes (
  id bigint PRIMARY KEY,
  post_id bigint REFERENCES posts(id),
  user_id uuid REFERENCES auth.users(id), 
  vote_type text CHECK (vote_type IN ('up', 'down')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)  -- One vote per user per post
);
```

### 🎨 **Frontend State Management**
```typescript
// State structure for votes
userVotes: Record<number, "up" | "down" | null>
postScores: Record<number, number>  // Net scores (upvotes - downvotes)

// Vote function
await togglePostVote(postId, 'up' | 'down')
```

### 📈 **Ranking Algorithm**
```sql
-- Ranking formula in post_rankings view
ranking_score = score + recency_boost
WHERE score = (upvotes - downvotes)
AND recency_boost = CASE 
  WHEN created_at > NOW() - INTERVAL '1 day' THEN 5
  WHEN created_at > NOW() - INTERVAL '3 days' THEN 3  
  WHEN created_at > NOW() - INTERVAL '7 days' THEN 1
  ELSE 0
END
```

## Migration Notes

### ✅ **Backwards Compatibility**
- All existing `togglePostLike()` calls still work
- Legacy `getUserLikedPosts()` returns upvoted posts only
- Existing post.likes field now represents net score

### 🛡️ **Rollback Plan**
If issues arise, you can rollback by:
1. Reverting to chronological sorting: comment out ranking logic in `fetchPosts()`
2. Database rollback: `ALTER TABLE post_likes DROP COLUMN vote_type;`

### 🔄 **Data Migration**
All existing likes are automatically treated as upvotes (vote_type = 'up' by default).

## Future Enhancements

### 🚀 **Potential Improvements**
1. **Weighted Voting**: Long-time users' votes count more
2. **Category-Specific Ranking**: Different algorithms for different post types
3. **Personalized Feed**: Factor in user's past voting patterns
4. **Anti-Gaming Measures**: Detect and prevent vote manipulation
5. **Analytics Dashboard**: Track voting patterns and content quality

This upgrade transforms PetalPath from a simple social feed into an intelligent content discovery platform that surfaces the best content for the Stanford community! 🎓✨ 