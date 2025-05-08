import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import CreatePost from '@/app/create/page'
import { createPost } from '@/lib/data/services/post-service'
import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock post service
jest.mock('@/lib/data/services/post-service', () => ({
  createPost: jest.fn(),
}))

// Mock location service
jest.mock('@/lib/data/services/location-service', () => ({
  getLocations: jest.fn().mockReturnValue([
    { id: 1, name: 'Test Location' },
    { id: 2, name: 'Another Location' },
  ]),
}))

describe('CreatePost', () => {
  const mockRouter = {
    push: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(createPost as jest.Mock).mockResolvedValue({ id: 1 })
  })

  it('renders create post form', () => {
    render(<CreatePost />)
    
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tags/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/images/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /post/i })).toBeInTheDocument()
  })

  it('validates required fields before submission', async () => {
    render(<CreatePost />)
    
    const submitButton = screen.getByRole('button', { name: /post/i })
    await userEvent.click(submitButton)

    expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    expect(screen.getByText(/location is required/i)).toBeInTheDocument()
    expect(createPost).not.toHaveBeenCalled()
  })

  it('handles image upload correctly', async () => {
    render(<CreatePost />)
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/images/i) as HTMLInputElement
    
    await userEvent.upload(input, file)
    
    expect(input.files?.[0]).toBe(file)
    expect(input.files).toHaveLength(1)
  })

  it('prevents uploading more than 5 images', async () => {
    render(<CreatePost />)
    
    const files = Array.from({ length: 6 }, (_, i) => 
      new File(['test'], `test${i}.jpg`, { type: 'image/jpeg' })
    )
    
    const input = screen.getByLabelText(/images/i) as HTMLInputElement
    await userEvent.upload(input, files)
    
    expect(input.files).toHaveLength(5)
    expect(screen.getByText(/maximum 5 images allowed/i)).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    render(<CreatePost />)
    
    // Fill in required fields
    await userEvent.type(screen.getByLabelText(/title/i), 'Test Post')
    await userEvent.type(screen.getByLabelText(/location/i), 'Test Location')
    
    // Fill in optional fields
    await userEvent.type(screen.getByLabelText(/description/i), 'Test Description')
    await userEvent.type(screen.getByLabelText(/tags/i), 'tag1, tag2')
    
    // Upload an image
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/images/i) as HTMLInputElement
    await userEvent.upload(input, file)
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /post/i })
    await userEvent.click(submitButton)
    
    await waitFor(() => {
      expect(createPost).toHaveBeenCalledWith({
        title: 'Test Post',
        description: 'Test Description',
        location: 'Test Location',
        tags: ['tag1', 'tag2'],
        images: expect.any(Array),
      })
      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })
  })

  it('handles form submission errors', async () => {
    const error = new Error('Failed to create post')
    ;(createPost as jest.Mock).mockRejectedValueOnce(error)
    
    render(<CreatePost />)
    
    // Fill in required fields
    await userEvent.type(screen.getByLabelText(/title/i), 'Test Post')
    await userEvent.type(screen.getByLabelText(/location/i), 'Test Location')
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /post/i })
    await userEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to create post/i)).toBeInTheDocument()
    })
  })

  it('handles image preview and removal', async () => {
    render(<CreatePost />)
    
    // Upload an image
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/images/i) as HTMLInputElement
    await userEvent.upload(input, file)
    
    // Check if preview is shown
    expect(screen.getByAltText(/preview/i)).toBeInTheDocument()
    
    // Remove image
    const removeButton = screen.getByRole('button', { name: /remove/i })
    await userEvent.click(removeButton)
    
    // Check if preview is removed
    expect(screen.queryByAltText(/preview/i)).not.toBeInTheDocument()
  })

  it('validates image file types', async () => {
    render(<CreatePost />)
    
    // Try to upload non-image file
    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    const input = screen.getByLabelText(/images/i) as HTMLInputElement
    await userEvent.upload(input, file)
    
    expect(screen.getByText(/only image files are allowed/i)).toBeInTheDocument()
  })

  it('handles tag input correctly', async () => {
    render(<CreatePost />)
    
    const tagInput = screen.getByLabelText(/tags/i)
    
    // Test adding tags
    await userEvent.type(tagInput, 'tag1, tag2, tag3')
    expect(screen.getByText('tag1')).toBeInTheDocument()
    expect(screen.getByText('tag2')).toBeInTheDocument()
    expect(screen.getByText('tag3')).toBeInTheDocument()
    
    // Test removing tags
    const removeTagButton = screen.getByRole('button', { name: /remove tag1/i })
    await userEvent.click(removeTagButton)
    expect(screen.queryByText('tag1')).not.toBeInTheDocument()
  })

  it('handles location selection correctly', async () => {
    render(<CreatePost />)
    
    const locationInput = screen.getByLabelText(/location/i)
    
    // Test location suggestions
    await userEvent.type(locationInput, 'Test')
    expect(screen.getByText('Test Location')).toBeInTheDocument()
    
    // Test location selection
    await userEvent.click(screen.getByText('Test Location'))
    expect(locationInput).toHaveValue('Test Location')
  })
}) 