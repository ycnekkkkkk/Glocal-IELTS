'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error boundary caught:', error)
    }
  }, [error])

  const getErrorMessage = () => {
    if (error.message) {
      // Check for common error patterns
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return 'Network error. Please check your internet connection and try again.'
      }
      if (error.message.includes('timeout')) {
        return 'Request timeout. The server is taking too long to respond. Please try again.'
      }
      if (error.message.includes('404')) {
        return 'Resource not found. The page or resource you are looking for does not exist.'
      }
      if (error.message.includes('500')) {
        return 'Server error. Something went wrong on our end. Please try again later.'
      }
      return error.message
    }
    return 'An unexpected error occurred. Please try again.'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="card max-w-md text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong!</h2>
        <p className="text-gray-600 mb-2">{getErrorMessage()}</p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-6">Error ID: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
          <button
            onClick={() => router.push('/')}
            className="btn-secondary"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}

