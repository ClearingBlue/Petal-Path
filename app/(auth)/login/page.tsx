'use client'

import { useState, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const supabase = useSupabaseClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Handle rate limiting specifically
        if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
          setError('Too many login attempts. Please wait a few minutes before trying again.')
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password')
        } else {
          setError(error.message)
        }
        return
      }

      // Success - redirect will happen automatically via auth state change
      const redirectTo = searchParams.get('redirect') ?? '/'
      router.push(redirectTo)
    } catch (err) {
      console.error('Sign in error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Welcome to PetalPath</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in to explore Stanford's campus
          </p>
        </div>
        
        <form onSubmit={handleSignIn} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        
        <p className="text-center text-sm">
          Don't have an account? <a href="/signup" className="underline">Join PetalPath</a>
        </p>
      </div>
    </div>
  )
} 