import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { signIn } from '@/services/firebase/auth'
import { useAuthStore } from '@/stores/authStore'
import { APP_NAME } from '@/config/constants'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const setFirebaseUser = useAuthStore((s) => s.setFirebaseUser)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await signIn(email, password)
      setFirebaseUser(user)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setLoading(false)
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-ward-text mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@hospital.org"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ward-text mb-1">Password</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <Button type="submit" className="w-full" loading={loading} icon={<LogIn className="h-4 w-4" />}>
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
