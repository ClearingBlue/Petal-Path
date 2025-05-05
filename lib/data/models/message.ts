/**
 * Message model definition and data
 */

import { getUnsplashImage } from "../utils/image-utils";
import { User, users } from "./user";

export type Message = {
  id: number;
  sender: User | null;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  participants?: User[];
  lastMessage: string;
  timestamp: string;
  unread: boolean;
};

// Mock messages data
export const messages: Message[] = [
  {
    id: 1,
    sender: null,
    isGroup: true,
    groupName: "Likes & Collect",
    groupAvatar: getUnsplashImage("group", 1, 40, 40),
    lastMessage: "John Smith liked your post",
    timestamp: "Today",
    unread: true,
  },
  {
    id: 2,
    sender: null,
    isGroup: true,
    groupName: "New Followers",
    groupAvatar: getUnsplashImage("group", 2, 40, 40),
    lastMessage: "Alex Johnson started following you",
    timestamp: "Yesterday",
    unread: false,
  },
  {
    id: 3,
    sender: null,
    isGroup: true,
    groupName: "Comments & @",
    groupAvatar: getUnsplashImage("group", 3, 40, 40),
    lastMessage: "Sam Wilson commented on your post",
    timestamp: "2d ago",
    unread: false,
  },
  {
    id: 4,
    sender: users[1],
    isGroup: false,
    lastMessage: "Hey, I loved your post about the Green Library!",
    timestamp: "3d ago",
    unread: false,
  },
  {
    id: 5,
    sender: users[2],
    isGroup: false,
    lastMessage: "Are you going to the campus event tomorrow?",
    timestamp: "1w ago",
    unread: false,
  },
  {
    id: 6,
    sender: null,
    isGroup: true,
    groupName: "Stanford CS Study Group",
    participants: [users[0], users[1], users[2], users[3]],
    lastMessage: "Alex: Has anyone started the assignment yet?",
    timestamp: "1w ago",
    unread: false,
  },
];
