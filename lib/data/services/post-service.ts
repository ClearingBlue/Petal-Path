import { Post, posts } from "@/lib/data/models/post";
import { users } from "@/lib/data/models/user";
import { locations } from "@/lib/data/models/location";
import { getUnsplashImage } from "@/lib/data/utils/image-utils";

export interface CreatePostInput {
  title: string;
  content: string;
  location: string;
  tags: string[];
  imageUrl: string;
}

// Mock post creation function
export async function createPost(input: CreatePostInput): Promise<number> {
  try {
    // Mock current user (in a real app this would come from authentication system)
    const currentUser = users[0];
    
    // Determine location ID
    const locationObj = locations.find(loc => loc.name === input.location) || locations[0];
    
    // Create new post ID (use current max ID + 1)
    const newId = Math.max(...posts.map(post => post.id)) + 1;
    
    // Use mock image or user provided image URL
    const imageUrl = input.imageUrl || getUnsplashImage("post", newId, 400, 400);
    
    // Create new post object
    const newPost: Post = {
      id: newId,
      user: currentUser,
      location: input.location,
      locationId: locationObj.id,
      image: imageUrl,
      title: input.title,
      description: input.content,
      tags: input.tags,
      likes: 0,
      comments: 0,
      createdAt: new Date().toISOString()
    };
    
    // Add new post to posts list
    posts.unshift(newPost);
    
    // Return new post ID
    return newId;
  } catch (error) {
    console.error("Failed to create post:", error);
    throw error;
  }
}

// Delete a post by ID
export function deletePost(postId: number): boolean {
  try {
    const initialLength = posts.length;
    
    // Find the index of the post with the specified ID
    const index = posts.findIndex(post => post.id === postId);
    
    // If post found, remove it from the array
    if (index !== -1) {
      posts.splice(index, 1);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Failed to delete post:", error);
    return false;
  }
}

// Check if user is the author of a post
export function isPostAuthor(postId: number, userId: number): boolean {
  const post = posts.find(post => post.id === postId);
  return post?.user.id === userId;
}

// Get all posts
export function getAllPosts(): Post[] {
  return [...posts];
}

// Get specific post
export function getPostById(postId: number): Post | undefined {
  return posts.find(post => post.id === postId);
}

// Get user posts
export function getUserPosts(userId: number): Post[] {
  return posts.filter(post => post.user.id === userId);
}
