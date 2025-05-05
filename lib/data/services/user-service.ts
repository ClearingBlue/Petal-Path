/**
 * User service with CRUD operations
 */

import { User, users } from "../models/user";
import { getAll, getById } from "./data-service";
import cache from "../../cache";

/**
 * Get all users
 */
export function getUsers(): User[] {
  return getAll<User>("users", users);
}

/**
 * Get user by ID
 */
export function getUser(id: number): User | undefined {
  return getById<User>("user", id, users);
}

/**
 * Get current user
 */
export function getCurrentUser(): User {
  const cacheKey = "current-user";
  const cachedUser = cache.get<User>(cacheKey);
  if (cachedUser) {
    return cachedUser;
  }

  // For demo purposes, return the first user as the current user
  cache.set(cacheKey, users[0]);
  return users[0];
}
