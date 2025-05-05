import cache from "../cache";
import { posts } from "./models/post";
import { comments } from "./models/comment";
import { messages } from "./models/message";

export * from "./services/data-service";
export * from "./utils/image-utils";
export * from "./services/location-service";
export * from "./models/post";
export * from "./models/comment";
export * from "./models/message";

export function getPosts() {
  return posts;
}

export function getPost(id: number) {
  return posts.find((post) => post.id === id);
}

export function getCommentsByPost(postId: number) {
  return comments.filter((comment) => comment.postId === postId);
}

export function getPostsByLocation(locationId: number) {
  return posts.filter((post) => post.locationId === locationId);
}

export function getCurrentUserPosts() {
  const user = getCurrentUser();
  return posts.filter((post) => post.user.id === user.id);
}

export interface User {
  id: number;
  name: string;
  username: string;
  avatar: string;
}

const defaultUser: User = {
  id: 1,
  name: "Jane Doe",
  username: "janedoe",
  avatar: "https://placekitten.com/200/200?image=9",
};

export function getCurrentUser(): User {
  const cachedUser = cache.get<User>("current-user");
  if (cachedUser) {
    return cachedUser;
  }
  return defaultUser;
}

export function getMessages() {
  return messages;
}
