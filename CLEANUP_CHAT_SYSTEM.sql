-- =====================================================
-- CLEANUP SCRIPT - Remove all chat system components
-- Run this first to clean up everything
-- =====================================================

-- 1. Drop triggers first (to avoid dependency issues)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_conversation_timestamp_trigger') THEN
    DROP TRIGGER update_conversation_timestamp_trigger ON public.messages;
  END IF;
END $$;

-- 2. Drop functions (to avoid dependency issues)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_or_create_conversation') THEN
    DROP FUNCTION get_or_create_conversation(uuid);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_conversation_timestamp') THEN
    DROP FUNCTION update_conversation_timestamp();
  END IF;
END $$;

-- 3. Drop tables in correct order (child tables first)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'message_reads' AND schemaname = 'public') THEN
    DROP TABLE public.message_reads CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'messages' AND schemaname = 'public') THEN
    DROP TABLE public.messages CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'conversations' AND schemaname = 'public') THEN
    DROP TABLE public.conversations CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'direct_messages' AND schemaname = 'public') THEN
    DROP TABLE public.direct_messages CASCADE;
  END IF;
END $$;

-- 4. Drop indexes (these will be removed with tables anyway, but just to be safe)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'conversations_user1_idx') THEN
    DROP INDEX public.conversations_user1_idx;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'conversations_user2_idx') THEN
    DROP INDEX public.conversations_user2_idx;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'conversations_last_message_idx') THEN
    DROP INDEX public.conversations_last_message_idx;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'messages_conversation_idx') THEN
    DROP INDEX public.messages_conversation_idx;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'messages_sender_idx') THEN
    DROP INDEX public.messages_sender_idx;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'message_reads_conversation_idx') THEN
    DROP INDEX public.message_reads_conversation_idx;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'message_reads_user_idx') THEN
    DROP INDEX public.message_reads_user_idx;
  END IF;
END $$;

-- 5. Confirmation message
SELECT 'All chat system components have been removed successfully. You can now run MINIMAL_CHAT_SETUP.sql' as cleanup_status; 