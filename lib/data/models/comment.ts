/**
 * Comment model definition and data
 */

import { User, users } from "./user";

export type Comment = {
  id: number;
  postId: number;
  user: User;
  text: string;
  createdAt: string;
  likes: number;
  parentId?: number; // 父评论ID，用于回复功能
  replies?: number[]; // 回复评论的ID数组
};

// Mock comments data
export const comments: Comment[] = [
  {
    id: 1,
    postId: 1,
    user: users[1],
    text: "This looks amazing! I need to check it out.",
    createdAt: "2023-04-15T15:00:00Z",
    likes: 3,
  },
  {
    id: 2,
    postId: 1,
    user: users[2],
    text: "Is it usually crowded? I've been looking for a quiet spot.",
    createdAt: "2023-04-15T15:30:00Z",
    likes: 1,
  },
  {
    id: 3,
    postId: 1,
    user: users[3],
    text: "Thanks for sharing! The lighting looks perfect for studying.",
    createdAt: "2023-04-15T16:15:00Z",
    likes: 2,
  },
  {
    id: 4,
    postId: 1,
    user: users[0],
    text: "@alexj Not at all! It's usually pretty empty, especially in the mornings.",
    createdAt: "2023-04-15T16:45:00Z",
    likes: 4,
  },
  {
    id: 5,
    postId: 1,
    user: users[2],
    text: "Perfect! I'll definitely check it out tomorrow.",
    createdAt: "2023-04-15T17:00:00Z",
    likes: 0,
  },
  {
    id: 6,
    postId: 2,
    user: users[0],
    text: "The salad bar is my favorite lunch spot too!",
    createdAt: "2023-04-14T13:00:00Z",
    likes: 2,
  },
  {
    id: 7,
    postId: 2,
    user: users[2],
    text: "Do they have vegan options?",
    createdAt: "2023-04-14T14:30:00Z",
    likes: 0,
  },
  {
    id: 8,
    postId: 2,
    user: users[1],
    text: "@alexj Yes, they have tons of vegan options!",
    createdAt: "2023-04-14T15:00:00Z",
    likes: 3,
  },
  {
    id: 9,
    postId: 3,
    user: users[0],
    text: "This is so beautiful! Perfect spot for reading.",
    createdAt: "2023-04-13T17:15:00Z",
    likes: 5,
  },
  {
    id: 10,
    postId: 3,
    user: users[1],
    text: "I love studying here when the weather is nice!",
    createdAt: "2023-04-13T18:00:00Z",
    likes: 2,
  },
  {
    id: 11,
    postId: 3,
    user: users[4],
    text: "The flowers are gorgeous this time of year!",
    createdAt: "2023-04-13T18:30:00Z",
    likes: 3,
  },
  {
    id: 12,
    postId: 3,
    user: users[5],
    text: "Is there good shade for hot days?",
    createdAt: "2023-04-13T19:15:00Z",
    likes: 0,
  },
  {
    id: 13,
    postId: 3,
    user: users[2],
    text: "@mikeb Yes, there are plenty of trees with great shade!",
    createdAt: "2023-04-13T19:45:00Z",
    likes: 1,
  },
  {
    id: 14,
    postId: 4,
    user: users[3],
    text: "I had no idea this room existed! Thanks for sharing.",
    createdAt: "2023-04-12T10:30:00Z",
    likes: 2,
  },
  {
    id: 15,
    postId: 4,
    user: users[5],
    text: "Is it reservation only or can anyone use it?",
    createdAt: "2023-04-12T11:15:00Z",
    likes: 0,
  },
  {
    id: 16,
    postId: 5,
    user: users[1],
    text: "Beautiful shot! What time was this taken?",
    createdAt: "2023-04-11T08:15:00Z",
    likes: 1,
  },
  {
    id: 17,
    postId: 5,
    user: users[3],
    text: "Around 6:30am! Worth waking up early for.",
    createdAt: "2023-04-11T09:00:00Z",
    likes: 3,
  },
  {
    id: 18,
    postId: 5,
    user: users[2],
    text: "Do you run there often? Looking for running buddies!",
    createdAt: "2023-04-11T10:30:00Z",
    likes: 0,
  },
  {
    id: 19,
    postId: 5,
    user: users[3],
    text: "@alexj Yes, almost every morning! Would love to have company.",
    createdAt: "2023-04-11T11:45:00Z",
    likes: 2,
  },
  {
    id: 20,
    postId: 6,
    user: users[0],
    text: "The architecture is breathtaking! Great photo.",
    createdAt: "2023-04-10T16:00:00Z",
    likes: 4,
  },
  {
    id: 21,
    postId: 6,
    user: users[2],
    text: "Did you go inside? The interior is even more impressive!",
    createdAt: "2023-04-10T16:45:00Z",
    likes: 2,
  },
  {
    id: 22,
    postId: 6,
    user: users[4],
    text: "Yes! The stained glass windows are incredible.",
    createdAt: "2023-04-10T17:30:00Z",
    likes: 3,
  },
  {
    id: 23,
    postId: 7,
    user: users[1],
    text: "Their lattes are the best! Have you tried the caramel one?",
    createdAt: "2023-04-09T11:30:00Z",
    likes: 2,
  },
  {
    id: 24,
    postId: 7,
    user: users[5],
    text: "Not yet, but that's next on my list!",
    createdAt: "2023-04-09T12:15:00Z",
    likes: 1,
  },
  {
    id: 25,
    postId: 7,
    user: users[3],
    text: "Do they have good study spaces there?",
    createdAt: "2023-04-09T13:00:00Z",
    likes: 0,
  },
  {
    id: 26,
    postId: 7,
    user: users[5],
    text: "@samw Yes, the back area is quiet and has plenty of outlets!",
    createdAt: "2023-04-09T13:45:00Z",
    likes: 3,
  },
];
