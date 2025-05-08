/**
 * Post model definition and data
 */

import { getUnsplashImage } from "../utils/image-utils";
import { User, users } from "./user";

export type Post = {
  id: number;
  user: User;
  location: string;
  locationId: number;
  images: string[];
  title: string;
  description: string;
  tags: string[];
  likes: number;
  comments: number;
  createdAt: string;
};

// Mock posts data
export const posts: Post[] = [
  {
    id: 1,
    user: users[0],
    location: "Green Library",
    locationId: 1,
    images: [getUnsplashImage("post", 1, 400, 400)],
    title: "Perfect study spot",
    description:
      "Found this quiet corner with great natural lighting and power outlets!",
    tags: ["#studyspot", "#quiet"],
    likes: 24,
    comments: 5,
    createdAt: "2023-04-15T14:30:00Z",
  },
  {
    id: 2,
    user: users[1],
    location: "Tressider Union",
    locationId: 2,
    images: [getUnsplashImage("post", 2, 400, 400)],
    title: "Best lunch spot on campus",
    description: "The new salad bar is amazing! So many fresh options.",
    tags: ["#foodie", "#lunch"],
    likes: 18,
    comments: 3,
    createdAt: "2023-04-14T12:15:00Z",
  },
  {
    id: 3,
    user: users[2],
    location: "The Oval",
    locationId: 3,
    images: [getUnsplashImage("post", 3, 400, 400)],
    title: "Spring vibes",
    description: "Perfect day for studying outside. The flowers are blooming!",
    tags: ["#nature", "#outdoors"],
    likes: 32,
    comments: 7,
    createdAt: "2023-04-13T16:45:00Z",
  },
  {
    id: 4,
    user: users[0],
    location: "Green Library",
    locationId: 1,
    images: [getUnsplashImage("post", 4, 400, 400)],
    title: "Hidden study room",
    description:
      "Just discovered this hidden study room on the 3rd floor. So quiet and peaceful!",
    tags: ["#studyspot", "#quiet", "#hidden"],
    likes: 15,
    comments: 2,
    createdAt: "2023-04-12T09:20:00Z",
  },
  {
    id: 5,
    user: users[3],
    location: "The Oval",
    locationId: 3,
    images: [getUnsplashImage("post", 5, 400, 400)],
    title: "Morning run",
    description:
      "Nothing beats a morning run around The Oval. The sunrise was beautiful today!",
    tags: ["#fitness", "#outdoors", "#morning"],
    likes: 27,
    comments: 4,
    createdAt: "2023-04-11T07:30:00Z",
  },
  {
    id: 6,
    user: users[4],
    location: "Memorial Church",
    locationId: 4,
    images: [getUnsplashImage("post", 6, 400, 400)],
    title: "Architectural beauty",
    description:
      "The details on this building are incredible. Such a peaceful place to reflect.",
    tags: ["#architecture", "#peaceful", "#history"],
    likes: 42,
    comments: 8,
    createdAt: "2023-04-10T15:20:00Z",
  },
  {
    id: 7,
    user: users[5],
    location: "CoHo Coffee House",
    locationId: 5,
    images: [getUnsplashImage("post", 7, 400, 400)],
    title: "Best coffee on campus",
    description: "Their new seasonal latte is to die for! Perfect study fuel.",
    tags: ["#coffee", "#studyspot", "#foodie"],
    likes: 36,
    comments: 6,
    createdAt: "2023-04-09T10:45:00Z",
  },
];
