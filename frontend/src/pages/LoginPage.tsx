import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, authApi } from '../api/client';
import { Banner } from '../components/Banner';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.login(email, password);
      navigate('/home');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid email or password');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md px-6">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">Sign in</h1>
      <Banner />
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow">
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="username" required />
        <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" required />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Login'}
        </button>

        <div className="flex justify-between pt-2 text-sm">
          <button
            type="button"
            className="text-slate-700 underline hover:text-slate-900"
            onClick={() => navigate('/signup')}
          >
            New User? Sign Up
          </button>
          <button
            type="button"
            className="text-slate-700 underline hover:text-slate-900"
            onClick={() => navigate('/change-password')}
          >
            Change Password
          </button>
        </div>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}

function Field({ label, type, value, onChange, autoComplete, required }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
    </label>
  );
}
