import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Illustration */}
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <MapPin size={40} className="text-slate-400" />
          </div>
          <div className="text-8xl font-bold text-slate-200 select-none">404</div>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h1>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          The page you are looking for does not exist or may have been moved.
          Check the URL or navigate back to the dashboard.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            iconLeft={<ArrowLeft size={16} />}
          >
            Go Back
          </Button>
          <Button
            onClick={() => navigate('/', { replace: true })}
            iconLeft={<Home size={16} />}
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
