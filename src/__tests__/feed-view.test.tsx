import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter } from "next/navigation"
import FeedView from "@/components/feed-view"
import { getLocationByName } from "@/lib/data/services/location-service"
import "@testing-library/jest-dom"

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}))

// Mock data
const mockPost = {
  id: 1,
  title: "Test Post",
  description: "Test Description",
  location: "Test Location",
  locationId: 1,
  tags: ["tag1", "tag2"],
  images: [
    "https://placekitten.com/400/400",
    "https://placekitten.com/401/401",
    "https://placekitten.com/402/402"
  ],
  user: {
    id: 1,
    name: "Test User",
    username: "testuser",
    avatar: "https://placekitten.com/100/100"
  },
  likes: 0,
  comments: 0,
  createdAt: new Date().toISOString()
}

// Mock data module
jest.mock("@/lib/data", () => ({
  getPosts: jest.fn().mockImplementation(() => [mockPost])
}))

// Mock location service
jest.mock("@/lib/data/services/location-service", () => ({
  getLocationByName: jest.fn().mockReturnValue({ id: 1, name: "Test Location" })
}))

describe("FeedView", () => {
  const mockRouter = {
    push: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  it("renders posts with multiple images", () => {
    render(<FeedView />)
    expect(screen.getByAltText(`${mockPost.title} - Image 1`)).toBeInTheDocument()
  })

  it("shows navigation arrows on hover for posts with multiple images", async () => {
    render(<FeedView />)
    
    const imageContainer = screen.getByTestId(`image-container-${mockPost.id}`)
    expect(imageContainer).toBeInTheDocument()
    
    // Hover over the image container
    fireEvent.mouseEnter(imageContainer)
    
    // Check if navigation arrows are visible
    const buttons = screen.getAllByRole("button")
    expect(buttons[0]).toHaveClass("opacity-100") // Previous button
    expect(buttons[1]).toHaveClass("opacity-100") // Next button
  })

  it("navigates between images when clicking arrows", async () => {
    render(<FeedView />)
    
    const imageContainer = screen.getByTestId(`image-container-${mockPost.id}`)
    
    // Hover to show navigation
    fireEvent.mouseEnter(imageContainer)
    
    // Click next button
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[1]) // Next button
    
    // Check if second image is shown
    expect(screen.getByAltText(`${mockPost.title} - Image 2`)).toBeInTheDocument()
    
    // Click previous button
    await userEvent.click(buttons[0]) // Previous button
    
    // Check if first image is shown again
    expect(screen.getByAltText(`${mockPost.title} - Image 1`)).toBeInTheDocument()
  })

  it("shows image count indicator for posts with multiple images", () => {
    render(<FeedView />)
    
    const dots = screen.getAllByTestId(new RegExp(`image-dot-${mockPost.id}-\\d+`))
    expect(dots).toHaveLength(mockPost.images.length)
  })

  it("updates image count indicator when navigating", async () => {
    render(<FeedView />)
    
    const imageContainer = screen.getByTestId(`image-container-${mockPost.id}`)
    
    // Hover to show navigation
    fireEvent.mouseEnter(imageContainer)
    
    // Click next button
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[1]) // Next button
    
    // Check if second dot is active
    const dots = screen.getAllByTestId(new RegExp(`image-dot-${mockPost.id}-\\d+`))
    expect(dots[1]).toHaveClass("bg-white")
    expect(dots[0]).toHaveClass("bg-white/50")
  })

  it("handles image loading errors", async () => {
    render(<FeedView />)
    
    const image = screen.getByAltText(`${mockPost.title} - Image 1`)
    
    // Simulate image loading error
    fireEvent.error(image)
    
    // Check if error message is shown
    expect(screen.getByText(/image not available/i)).toBeInTheDocument()
  })

  it("maintains image state when navigating between posts", async () => {
    render(<FeedView />)
    
    const imageContainer = screen.getByTestId(`image-container-${mockPost.id}`)
    
    // Navigate to second image
    fireEvent.mouseEnter(imageContainer)
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[1]) // Next button
    
    // Click on post title to navigate away
    const postTitle = screen.getByTestId(`post-title-${mockPost.id}`)
    fireEvent.click(postTitle)
    
    // Navigate back
    mockRouter.push.mock.calls[0][0] = "/"
    render(<FeedView />)
    
    // Check if still on second image
    expect(screen.getByAltText(`${mockPost.title} - Image 2`)).toBeInTheDocument()
  })

  it("handles keyboard navigation for images", async () => {
    render(<FeedView />)
    
    const imageContainer = screen.getByTestId(`image-container-${mockPost.id}`)
    
    // Focus the image container
    fireEvent.focus(imageContainer)
    
    // Press right arrow
    fireEvent.keyDown(imageContainer, { key: "ArrowRight" })
    expect(screen.getByAltText(`${mockPost.title} - Image 2`)).toBeInTheDocument()
    
    // Press left arrow
    fireEvent.keyDown(imageContainer, { key: "ArrowLeft" })
    expect(screen.getByAltText(`${mockPost.title} - Image 1`)).toBeInTheDocument()
  })

  it("shows placeholder for posts without images", () => {
    const postWithoutImages = {
      ...mockPost,
      images: []
    }
    jest.mock("@/lib/data", () => ({
      getPosts: jest.fn().mockImplementation(() => [postWithoutImages])
    }))
    
    render(<FeedView />)
    
    expect(screen.getByText(/no images/i)).toBeInTheDocument()
  })
}) 