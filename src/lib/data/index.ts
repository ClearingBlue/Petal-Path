import { Post } from './models/post'

export function getPosts(): Post[] {
  return [
    {
      id: 1,
      title: "Beautiful Sunset at Central Park",
      description: "Caught this amazing sunset while walking through Central Park. The colors were absolutely breathtaking!",
      location: "Central Park",
      locationId: 1,
      tags: ["sunset", "nature", "nyc"],
      images: [
        "https://placekitten.com/800/800",
        "https://placekitten.com/801/801",
        "https://placekitten.com/802/802"
      ],
      user: {
        id: 1,
        name: "Jane Smith",
        username: "janesmith",
        avatar: "https://placekitten.com/100/100"
      },
      likes: 42,
      comments: 12,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      title: "Coffee Art",
      description: "Starting my morning with this beautiful latte art at my favorite local café.",
      location: "Artisan Coffee House",
      locationId: 2,
      tags: ["coffee", "art", "morning"],
      images: [
        "https://placekitten.com/803/803"
      ],
      user: {
        id: 2,
        name: "John Doe",
        username: "johndoe",
        avatar: "https://placekitten.com/101/101"
      },
      likes: 28,
      comments: 5,
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      title: "Urban Adventure",
      description: "Exploring the hidden gems of the city. Found these amazing street art pieces!",
      location: "Downtown District",
      locationId: 3,
      tags: ["streetart", "urban", "exploration"],
      images: [
        "https://placekitten.com/804/804",
        "https://placekitten.com/805/805",
        "https://placekitten.com/806/806",
        "https://placekitten.com/807/807"
      ],
      user: {
        id: 3,
        name: "Alex Turner",
        username: "alexturner",
        avatar: "https://placekitten.com/102/102"
      },
      likes: 56,
      comments: 8,
      createdAt: new Date().toISOString()
    }
  ]
} 