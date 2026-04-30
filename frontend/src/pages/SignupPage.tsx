import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, authApi } from '../api/client';

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  address: string;
  designation: string;
}

const initial: FormState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  address: '',
  designation: '',
};

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setGeneralError(null);
    const local: Record<string, string> = {};
    if (form.password !== form.confirmPassword) {
      local.confirmPassword = 'Passwords do not match';
    }
    if (form.password.length < 8) {
      local.password = 'Password must be at least 8 characters';
    }
    if (Object.keys(local).length > 0) {
      setFieldErrors(local);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await authApi.signup(form);
      navigate('/?msg=' + encodeURIComponent('Signed in successful'));
    } catch (err) {
      if (err instanceof ApiError && err.body?.fieldErrors) {
        setFieldErrors(err.body.fieldErrors);
      } else if (err instanceof ApiError) {
        setGeneralError(err.body?.message || 'Sign up failed');
      } else {
        setGeneralError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto my-12 max-w-lg px-6">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">Create account</h1>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow" noValidate>
        <Field label="Name" value={form.name} onChange={(v) => update('name', v)} error={fieldErrors.name} required />
        <Field label="Email" type="email" value={form.email} onChange={(v) => update('email', v)} error={fieldErrors.email} required />
        <Field label="Password" type="password" value={form.password} onChange={(v) => update('password', v)} error={fieldErrors.password} required />
        <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={(v) => update('confirmPassword', v)} error={fieldErrors.confirmPassword} required />
        <Field label="Address" value={form.address} onChange={(v) => update('address', v)} error={fieldErrors.address} required />
        <Field label="Designation" value={form.designation} onChange={(v) => update('designation', v)} error={fieldErrors.designation} required />

        {generalError && <p className="text-sm text-red-600">{generalError}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            className="text-sm text-slate-700 underline hover:text-slate-900"
            onClick={() => navigate('/')}
          >
            Back to login
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Sign Up'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
  required?: boolean;
}

function Field({ label, value, onChange, type = 'text', error, required }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`w-full rounded border px-3 py-2 focus:outline-none focus:ring-1 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
            : 'border-slate-300 focus:border-slate-500 focus:ring-slate-500'
        }`}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
