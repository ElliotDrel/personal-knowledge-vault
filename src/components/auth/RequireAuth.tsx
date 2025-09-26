import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    // Show loading spinner while checking authentication
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    // Redirect to auth page with current location as redirect target
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return <>{children}</>
}