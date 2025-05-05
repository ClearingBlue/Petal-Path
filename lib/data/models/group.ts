export interface Group {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  memberIds: number[];
  adminIds: number[];
}

export const groups: Group[] = [
  {
    id: 1,
    name: "Campus Explorers",
    description: "Group for exploring hidden spots on campus",
    memberIds: [1, 2, 3],
    adminIds: [1],
  },
];
