import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { MessageBanner } from '../components/Banner';
import { FormField, FormErrorSummary } from '../components/FormField';
import { useFormValidation } from '../lib/useFormValidation';
import { email, firstError, required } from '../lib/validation';

interface LoginValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    values, errors, touched, formError,
    setValue, blur, validateAll, applyServerError,
  } = useFormValidation<LoginValues>(
    { email: '', password: '' },
    {
      email: (v) => firstError(v, required('Email'), email()),
      password: (v) => required('Password')(v),
    },
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateAll()) return;

    setSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
      navigate('/home');
    } catch (err) {
      applyServerError(err, 'Sign-in failed. Please try again.');
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
            <FormField
              label="Email"
              type="email"
              value={values.email}
              onChange={(v) => setValue('email', v)}
              onBlur={() => blur('email')}
              error={errors.email}
              touched={touched.email}
              autoComplete="username"
              placeholder="name@example.com"
              required
              pill
            />
            <FormField
              label="Password"
              type="password"
              value={values.password}
              onChange={(v) => setValue('password', v)}
              onBlur={() => blur('password')}
              error={errors.password}
              touched={touched.password}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              pill
            />

            <FormErrorSummary message={formError} />

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

        {/* ── Resource links: use-case PDF + GitHub repo ───────────────── */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[#1a2e52]">
          <a
            href="/USECASE-Login-Application.pdf"
            download
            className="inline-flex items-center gap-1.5 rounded-full bg-white/40 px-3 py-1.5 font-semibold ring-1 ring-white/60 backdrop-blur-sm transition hover:bg-white/70"
            title="Download the use-case document (PDF)"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M10 2a1 1 0 011 1v8.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 11.586V3a1 1 0 011-1z"/>
              <path d="M3 15a1 1 0 011 1v1h12v-1a1 1 0 112 0v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2a1 1 0 011-1z"/>
            </svg>
            Use Case (PDF)
          </a>
          <a
            href="https://github.com/aigenxlab-GH/Login-app.git"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/40 px-3 py-1.5 font-semibold ring-1 ring-white/60 backdrop-blur-sm transition hover:bg-white/70"
            title="Open the source-code repository on GitHub"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.74 2.68 1.24 3.33.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 015.78 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.05.78 2.12v3.14c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/>
            </svg>
            Source Code
          </a>
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
