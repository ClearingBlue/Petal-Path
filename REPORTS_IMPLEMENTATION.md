# Reports System Implementation

This document outlines the implementation of the content reporting system for PetalPath, allowing users to report inappropriate posts for manual moderation.

## Database Schema

### Reports Table
Located in: `SUPABASE_REPORTS.sql`

```sql
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
  unique(post_id, reported_by)
);
```

**Key Features:**
- Prevents duplicate reports from the same user for the same post
- Tracks report status through the moderation workflow
- Links to both post and user tables with proper cascading
- RLS policies protect user privacy

## TypeScript Functions

### Database Layer
Located in: `lib/db/reports.ts`

**Functions:**
- `createReport(data)` - Submit a new report
- `getUserReports()` - Get user's own reports
- `checkUserHasReported(postId)` - Check if user has reported a specific post

**Features:**
- Proper error handling for duplicate reports
- Type-safe interfaces for all data structures
- Handles unique constraint violations gracefully

## UI Components

### Report Dialog
Located in: `components/report-dialog.tsx`

**Features:**
- Modal dialog with predefined report reasons
- Optional additional information field
- Prevents duplicate reporting (shows "Reported" state)
- Toast notifications for user feedback
- Proper form validation

**Report Reasons:**
- Spam or misleading content
- Inappropriate or offensive content
- Harassment or bullying
- False information about location
- Copyright violation
- Other

### Feed Integration
Updated: `components/feed-view.tsx`

**Changes:**
- Added report button to each post card
- Integrated with existing post state management
- Loads user's reported posts on feed initialization
- Shows appropriate button state (Report vs Reported)

## Admin Interface

### Reports Management Page
Located in: `app/admin/reports/page.tsx`

**Features:**
- View all reports with post details
- Status tracking (pending, reviewed, resolved, dismissed)
- One-click status updates
- Chronological ordering of reports
- Post preview with title and description

**Admin Actions:**
- Mark as Reviewed
- Resolve
- Dismiss

## Security & Privacy

### Row Level Security (RLS)
- Users can only see their own reports
- Users can only create reports for themselves
- Admin policies can be added separately

### Data Protection
- No sensitive user information exposed
- Reports are linked by UUID (user IDs)
- Proper cascading deletes when posts/users are removed

## Usage

### For Users
1. Click the "Report" button on any post
2. Select a reason from the dropdown
3. Optionally add additional information
4. Submit the report
5. Button changes to "Reported" state

### For Moderators
1. Visit `/admin/reports` page
2. Review reported content and reasons
3. Update status as appropriate:
   - **Reviewed**: Acknowledged but no action needed
   - **Resolved**: Issue addressed (post removed, user warned, etc.)
   - **Dismissed**: Report was invalid or inappropriate

## Integration Notes

### Minimal Code Approach
- Uses existing UI components (Dialog, Select, Textarea, etc.)
- Leverages current database patterns and RLS policies
- Integrates seamlessly with existing feed functionality
- No SQL functions - all logic in TypeScript

### State Management
- Reports status tracked in component state
- Loads asynchronously with other post data
- Optimistic UI updates for better UX
- Proper error handling and user feedback

## Next Steps

### Potential Enhancements
1. **Email Notifications**: Notify moderators of new reports
2. **Bulk Actions**: Handle multiple reports at once
3. **Report Categories**: More specific categorization
4. **User Reputation**: Track users with frequent valid/invalid reports
5. **Automated Moderation**: Flag posts with multiple reports
6. **Report Analytics**: Track common report reasons and trends

### Admin Role Setup
To restrict admin access, add role-based policies:

```sql
-- Add admin role check to reports policies
CREATE POLICY "Admins can view all reports" ON public.reports
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

This implementation provides a solid foundation for content moderation while maintaining simplicity and following established patterns in the codebase. 