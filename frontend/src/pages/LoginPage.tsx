import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { login } from '../api/auth';
import { MessageBanner } from '../components/Banner';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const missing: string[] = [];
    if (!email.trim()) missing.push('Username');
    if (!password) missing.push('Password');
    if (missing.length > 0) {
      setError(`Please fill the ${missing.join(', ')}.`);
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/home');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.body?.message ?? 'Invalid email or password.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-sky-400 px-4">
      <Cloud className="left-[-60px] top-10 h-36 w-72 opacity-60" />
      <Cloud className="right-[-40px] top-6 h-28 w-56 opacity-50" />
      <Cloud className="bottom-16 left-10 h-24 w-48 opacity-40" />
      <Cloud className="bottom-8 right-8 h-20 w-44 opacity-35" />
      <Cloud className="left-1/4 top-4 h-20 w-40 opacity-30" />

      <div className="relative z-10 w-full max-w-xs">
        <MessageBanner />

        <div className="rounded-3xl bg-white/30 px-8 pb-8 pt-6 shadow-xl backdrop-blur-md ring-1 ring-white/50">
          <div className="mb-4 flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1a2e52] shadow-lg">
              <svg viewBox="0 0 24 24" fill="white" className="h-9 w-9">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            </div>
            <h1 className="mt-3 text-xl font-bold text-[#1a2e52]">User Login</h1>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1a2e52]">
                Username <span className="text-red-300">*</span>
              </label>
              <input
                type="email"
                placeholder="Username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                className="w-full rounded-full border-0 bg-white/80 px-5 py-3 text-sm text-slate-700 placeholder-slate-400 shadow-inner outline-none focus:ring-2 focus:ring-white/70"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1a2e52]">
                Password <span className="text-red-300">*</span>
              </label>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-full border-0 bg-white/80 px-5 py-3 text-sm text-slate-700 placeholder-slate-400 shadow-inner outline-none focus:ring-2 focus:ring-white/70"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-red-100/80 px-4 py-2 text-center text-xs text-red-700">
                {error}
              </p>
            )}

            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate('/change-password')}
                className="text-xs text-[#1a2e52] hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#1a2e52] py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#223568] disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-[#1a2e52]">
            New here?{' '}
            <button
              type="button"
              className="font-semibold hover:underline"
              onClick={() => navigate('/signup')}
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cloud({ className }: { className: string }) {
  return (
    <div className={`pointer-events-none absolute ${className}`}>
      <div className="relative h-full w-full">
        <div className="absolute inset-0 rounded-full bg-white" />
        <div className="absolute -top-1/3 left-1/4 h-3/4 w-2/5 rounded-full bg-white" />
        <div className="absolute -top-1/4 left-1/2 h-2/3 w-1/3 rounded-full bg-white" />
      </div>
    </div>
  );
}
