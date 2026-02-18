import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff, Stethoscope, ShieldCheck } from 'lucide-react';
import { signIn, signInWithGoogle } from '@/services/firebase/auth';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

export default function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  function validate(): boolean {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    }

    return valid;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      switch (code) {
        case 'auth/user-not-found':
          setError('No account found with this email address.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password. Please try again.');
          break;
        case 'auth/invalid-credential':
          setError('Invalid credentials. Please check your email and password.');
          break;
        case 'auth/too-many-requests':
          setError('Too many sign-in attempts. Please try again later or reset your password.');
          break;
        case 'auth/network-request-failed':
          setError('Network error. Please check your connection.');
          break;
        default:
          setError('Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user') {
        setError('Google sign in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Spinner size="lg" label="Loading..." className="text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* ---- Left panel (branding) — visible on lg+ ---- */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <Stethoscope size={22} className="text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-white">MedWard Pro</span>
            <p className="text-xs text-blue-200">Clinical Ward Management</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative">
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            The clinical tool built for real hospital environments
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed mb-8">
            Manage ward patients, track tasks, review labs, and hand over safely —
            all in one place designed for busy clinical teams.
          </p>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              'Real-time patient monitoring with acuity tracking',
              'AI-powered clinical decision support',
              'Structured shift handover (SBAR)',
              'Lab result analysis and critical alerts',
              'Medication reference and interaction checking',
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-2.5">
                <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-white/20 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </div>
                <p className="text-sm text-blue-100">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security badge */}
        <div className="relative flex items-center gap-2 text-blue-300 text-xs">
          <ShieldCheck size={14} />
          <span>HIPAA-aligned &middot; End-to-end security &middot; Audit logging</span>
        </div>
      </div>

      {/* ---- Right panel (login form) ---- */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo (shown on < lg) */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Stethoscope size={22} className="text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">MedWard Pro</span>
              <p className="text-xs text-slate-400">Clinical Ward Management</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Sign in</h1>
            <p className="mt-1 text-sm text-slate-400">
              Access your clinical dashboard
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-red-900/40 border border-red-700/50">
              <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-red-500/30 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
              </div>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                Email address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                  placeholder="you@hospital.org"
                  autoComplete="email"
                  disabled={loading || googleLoading}
                  className={[
                    'w-full h-11 pl-9 pr-3 rounded-xl text-sm text-white',
                    'bg-slate-800 border placeholder:text-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500',
                    'disabled:opacity-50',
                    emailError ? 'border-red-500' : 'border-slate-700',
                  ].join(' ')}
                />
              </div>
              {emailError && <p className="text-xs text-red-400 mt-1">{emailError}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(''); }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading || googleLoading}
                  className={[
                    'w-full h-11 pl-9 pr-10 rounded-xl text-sm text-white',
                    'bg-slate-800 border placeholder:text-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500',
                    'disabled:opacity-50',
                    passwordError ? 'border-red-500' : 'border-slate-700',
                  ].join(' ')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {passwordError && <p className="text-xs text-red-400 mt-1">{passwordError}</p>}
            </div>

            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={googleLoading}
              iconLeft={!loading ? <LogIn size={15} /> : undefined}
              className="h-11 text-sm"
            >
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-slate-900 text-slate-500">or continue with</span>
            </div>
          </div>

          {/* Google sign in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className={[
              'w-full h-11 flex items-center justify-center gap-2.5',
              'rounded-xl text-sm font-medium',
              'bg-slate-800 border border-slate-700 text-slate-300',
              'hover:bg-slate-700 hover:border-slate-600 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {googleLoading ? (
              <Spinner size="sm" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Sign in with Google
          </button>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-slate-500">
            By signing in, you agree to our{' '}
            <a href="/terms" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">
              Terms
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">
              Privacy Policy
            </a>
          </p>

          <p className="mt-4 text-center text-xs text-slate-600">
            MedWard Pro &mdash; For authorized clinical use only
          </p>
        </div>
      </div>
    </div>
  );
}
