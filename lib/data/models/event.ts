export interface Event {
  id: number;
  title: string;
  description: string;
  locationId: number;
  date: string;
  imageUrl?: string;
  hostId: number;
  attendeeIds: number[];
}

export const events: Event[] = [
  {
    id: 1,
    title: "Campus Tour",
    description: "Guided tour of the main campus landmarks",
    locationId: 1,
    date: "2023-06-15T14:00:00Z",
    hostId: 1,
    attendeeIds: [2, 3, 4],
  },
];
