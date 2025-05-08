export interface Post {
  id: number
  title: string
  description: string
  location: string
  locationId: number
  tags: string[]
  images: string[]
  user: {
    id: number
    name: string
    username: string
    avatar: string
  }
  likes: number
  comments: number
  createdAt: string
} 