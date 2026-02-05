import useAuthStore from '../stores/authStore';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const signingIn = useAuthStore((s) => s.signingIn);
  const clearError = useAuthStore((s) => s.clearError);

  return (
    <div className="min-h-screen flex items-center justify-center bg-clinical-white">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-trust-blue rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">MedWard Pro</h1>
          <p className="text-neutral-500 mt-1 text-sm">Clinical Command Center</p>
        </div>

        {error && (
          <div className="bg-critical-red-bg border border-critical-red-border text-critical-red text-sm p-3 rounded-lg mb-4">
            <p>{error}</p>
            <button
              onClick={clearError}
              className="mt-2 text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <button
          onClick={login}
          disabled={signingIn}
          className="w-full bg-trust-blue text-white py-3 px-4 rounded-lg font-semibold
                     hover:bg-trust-blue-light transition-colors flex items-center justify-center gap-3
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {signingIn ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Signing in...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        <p className="text-center text-xs text-neutral-400 mt-8">
          For educational purposes only. Not a certified medical device.
        </p>
      </div>
    </div>
  );
}
