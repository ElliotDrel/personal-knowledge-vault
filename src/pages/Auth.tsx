import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, CheckCircle } from 'lucide-react'

export default function Auth() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Get intended destination from router state or search params
  const fromState = location.state?.from?.pathname
  const redirectParam = searchParams.get('redirectTo')
  const from =
    (fromState && fromState.startsWith('/') && fromState) ||
    (redirectParam && redirectParam.startsWith('/') && redirectParam) ||
    '/'

  // Redirect authenticated users
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true })
    }
  }, [user, navigate, from])

  // Handle magic link callback
  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = searchParams.get('code')
      if (code) {
        setLoading(true)
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setError('Invalid or expired magic link. Please request a new one.')
          } else {
            // AuthContext will handle the session update
            navigate(from, { replace: true })
          }
        } catch (err) {
          setError('An error occurred while signing in. Please try again.')
        } finally {
          setLoading(false)
        }
      }
    }

    handleAuthCallback()
  }, [searchParams, navigate, from])

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Please set up your environment variables.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage(`Magic link sent to ${email}! Check your email and click the link to sign in.`)
        setCooldown(60) // 60 second cooldown
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = () => {
    if (cooldown === 0) {
      const syntheticEvent = {
        preventDefault: () => {}
      } as React.FormEvent<HTMLFormElement>
      handleSignIn(syntheticEvent)
    }
  }

  if (user) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Knowledge Vault</CardTitle>
          <CardDescription>
            Enter your email to receive a magic link for passwordless sign-in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || cooldown > 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Magic Link
                </>
              )}
            </Button>

            {message && cooldown === 0 && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={loading}
              >
                Resend Magic Link
              </Button>
            )}
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ul className="text-left space-y-1">
              <li>Enter your email address above</li>
              <li>Check your email for the magic link</li>
              <li>Click the link to sign in instantly</li>
              <li>No password needed!</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
