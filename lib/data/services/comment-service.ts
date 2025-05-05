/**
 * Comment service with CRUD operations
 */

import { Comment, comments } from "../models/comment";
import { getAll, filterBy } from "./data-service";

/**
 * Get all comments
 */
export function getComments(): Comment[] {
  return getAll<Comment>("comments", comments);
}

/**
 * Get comments by post ID
 */
export function getCommentsByPost(postId: number): Comment[] {
  return filterBy<Comment>(
    "comments",
    "post",
    postId,
    comments,
    (comment: Comment) => comment.postId === postId
  );
}
