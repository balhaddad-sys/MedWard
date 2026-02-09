import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, Shield, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { signIn, signInWithGoogle, getUserProfile } from '@/services/firebase/auth'
import { useAuthStore } from '@/stores/authStore'
import { APP_NAME } from '@/config/constants'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function getFriendlyErrorMessage(error: Error): string {
  const msg = error.message.toLowerCase()
  if (msg.includes('user-not-found') || msg.includes('auth/user-not-found')) {
    return 'No account found with this email. Please check the address or contact your administrator.'
  }
  if (msg.includes('wrong-password') || msg.includes('auth/wrong-password') || msg.includes('invalid-credential') || msg.includes('auth/invalid-credential')) {
    return 'Incorrect password. Please try again or use Google sign-in.'
  }
  if (msg.includes('invalid-email') || msg.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.'
  }
  if (msg.includes('too-many-requests') || msg.includes('auth/too-many-requests')) {
    return 'Too many failed attempts. Please wait a few minutes before trying again.'
  }
  if (msg.includes('network-request-failed') || msg.includes('auth/network-request-failed')) {
    return 'Network error. Please check your internet connection and try again.'
  }
  if (msg.includes('popup-closed') || msg.includes('auth/popup-closed-by-user')) {
    return 'Sign-in popup was closed. Please try again when ready.'
  }
  if (msg.includes('account-exists') || msg.includes('auth/account-exists-with-different-credential')) {
    return 'An account already exists with this email using a different sign-in method.'
  }
  return error.message
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const setFirebaseUser = useAuthStore((s) => s.setFirebaseUser)
  const setUser = useAuthStore((s) => s.setUser)
  const authUser = useAuthStore((s) => s.user)
  const authFirebaseUser = useAuthStore((s) => s.firebaseUser)

  // Auto-redirect when already authenticated (handles race conditions & redirect flow)
  useEffect(() => {
    if (authUser && authFirebaseUser) {
      navigate('/', { replace: true })
    }
  }, [authUser, authFirebaseUser, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Please enter your email address.'); return }
    if (!password) { setError('Please enter your password.'); return }
    setLoading(true)
    try {
      const user = await signIn(email, password)
      setFirebaseUser(user)
      const profile = await getUserProfile(user.uid)
      setUser(profile)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? getFriendlyErrorMessage(err) : 'Failed to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      const user = await signInWithGoogle()
      setFirebaseUser(user)
      const profile = await getUserProfile(user.uid)
      setUser(profile)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? getFriendlyErrorMessage(err) : 'Failed to sign in with Google. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-ward-text">{APP_NAME}</h1>
          <p className="text-sm text-ward-muted mt-1">Clinical Ward Management System</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-4" role="alert">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-ward-border bg-white text-ward-text font-medium text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <div className="h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <GoogleIcon className="h-5 w-5" />
          )}
          Sign in with Google
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-ward-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-ward-card px-2 text-ward-muted">or sign in with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-ward-text mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="doctor@hospital.org"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ward-text mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field pr-10"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-ward-muted hover:text-ward-text transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" loading={loading} disabled={googleLoading} icon={<LogIn className="h-4 w-4" />}>
            Sign In
          </Button>
        </form>

        <p className="text-xs text-center text-ward-muted mt-6">
          Protected health information. Authorized users only.
        </p>
      </Card>
    </div>
  )
}
