/**
 * User model definition and data
 */

import { getUnsplashImage } from "../utils/image-utils";

export interface User {
  id: number;
  name: string;
  username: string;
  avatar: string;
}

// Mock users data
export const users: User[] = [
  {
    id: 1,
    name: "Jane Doe",
    username: "janedoe",
    avatar: "https://placekitten.com/200/200?image=9",
  },
  {
    id: 2,
    name: "John Smith",
    username: "johnsmith",
    avatar: "https://placekitten.com/200/200?image=3",
  },
  {
    id: 3,
    name: "Alex Johnson",
    username: "alexj",
    avatar: "https://placekitten.com/200/200?image=4",
  },
  {
    id: 4,
    name: "Sam Wilson",
    username: "samw",
    avatar: "https://placekitten.com/200/200?image=5",
  },
  {
    id: 5,
    name: "Emily Chen",
    username: "emilyc",
    avatar: "https://placekitten.com/200/200?image=6",
  },
  {
    id: 6,
    name: "Michael Brown",
    username: "mikeb",
    avatar: "https://placekitten.com/200/200?image=7",
  },
];
