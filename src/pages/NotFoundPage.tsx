import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-ward-bg p-4">
      <div className="max-w-md w-full text-center">
        <div className="h-20 w-20 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl font-bold text-primary-600">404</span>
        </div>
        <h1 className="text-2xl font-bold text-ward-text mb-2">Page not found</h1>
        <p className="text-sm text-ward-muted mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate(-1)}
            variant="secondary"
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Go back
          </Button>
          <Button
            onClick={() => navigate('/')}
            icon={<Home className="h-4 w-4" />}
          >
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
