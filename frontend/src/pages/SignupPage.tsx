import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { signup } from '../api/auth';
import { PageShell } from '../components/PageShell';

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  address: string;
  designation: string;
  role: 'ADMIN' | 'GENERAL';
}

const initial: FormState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  address: '',
  designation: '',
  role: 'GENERAL',
};

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setGeneralError(null);

    const local: Record<string, string> = {};

    // Empty field checks
    if (!form.name.trim()) local.name = 'Required';
    if (!form.email.trim()) local.email = 'Required';
    if (!form.password) local.password = 'Required';
    if (!form.confirmPassword) local.confirmPassword = 'Required';
    if (!form.address.trim()) local.address = 'Required';
    if (!form.designation.trim()) local.designation = 'Required';
    if (!form.role) local.role = 'Required';

    // Collect names of empty fields for the banner message
    const fieldLabels: Record<string, string> = {
      name: 'Full Name',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      address: 'Address',
      designation: 'Designation',
      role: 'User Type',
    };
    const missing = Object.keys(local).map((k) => fieldLabels[k]);
    if (missing.length > 0) {
      setFieldErrors(local);
      setGeneralError(`Please fill the ${missing.join(', ')}.`);
      return;
    }

    // Business rule checks
    if (form.password.length < 8) {
      local.password = 'Password must be at least 8 characters.';
    }
    if (form.password !== form.confirmPassword) {
      local.confirmPassword = 'Passwords do not match.';
    }
    if (Object.keys(local).length > 0) {
      setFieldErrors(local);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      await signup(form);
      navigate('/?msg=' + encodeURIComponent('Account created! Please sign in.'));
    } catch (err) {
      if (err instanceof ApiError && err.body?.details) {
        setFieldErrors(err.body.details);
      } else if (err instanceof ApiError) {
        setGeneralError(err.body?.message ?? 'Sign up failed. Please try again.');
      } else {
        setGeneralError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#1a2e52]">Create an account</h1>
          <p className="mt-2 text-sm text-white/80">Fill in your details to get started</p>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="rounded-3xl bg-white/30 p-8 shadow-xl backdrop-blur-md ring-1 ring-white/50"
        >
          <div className="space-y-5">
            <Field label="Full Name" value={form.name} onChange={(v) => update('name', v)}
              error={fieldErrors.name} autoComplete="name" required />
            <Field label="Email" type="email" value={form.email} onChange={(v) => update('email', v)}
              error={fieldErrors.email} autoComplete="email" required />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Password" type="password" value={form.password}
                onChange={(v) => update('password', v)} error={fieldErrors.password}
                autoComplete="new-password" required />
              <Field label="Confirm Password" type="password" value={form.confirmPassword}
                onChange={(v) => update('confirmPassword', v)} error={fieldErrors.confirmPassword}
                autoComplete="new-password" required />
            </div>
            <Field label="Address" value={form.address} onChange={(v) => update('address', v)}
              error={fieldErrors.address} autoComplete="street-address" required />
            <Field label="Designation" value={form.designation} onChange={(v) => update('designation', v)}
              error={fieldErrors.designation} required />
            <RoleSelect value={form.role} onChange={(v) => update('role', v as 'ADMIN' | 'GENERAL')}
              error={fieldErrors.role} />
          </div>

          {generalError && (
            <p role="alert" className="mt-5 rounded-xl bg-red-100/80 px-4 py-2 text-center text-xs text-red-700">
              {generalError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-full bg-[#1a2e52] py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#223568] disabled:opacity-60"
          >
            {submitting ? 'Creating account…' : 'Sign Up'}
          </button>

          <p className="mt-5 border-t border-white/30 pt-5 text-center text-sm text-[#1a2e52]">
            Already have an account?{' '}
            <button type="button" className="font-semibold hover:underline" onClick={() => navigate('/')}>
              Sign in
            </button>
          </p>
        </form>
      </div>
    </PageShell>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
  autoComplete?: string;
  required?: boolean;
}

function Field({ label, value, onChange, type = 'text', error, autoComplete, required }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#1a2e52]">
        {label} {required && <span className="text-red-300">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={`w-full rounded-full border-0 bg-white/80 px-5 py-2.5 text-sm text-slate-700 placeholder-slate-400 shadow-inner outline-none focus:ring-2 ${
          error ? 'ring-2 ring-red-400' : 'focus:ring-white/70'
        }`}
      />
      {error && <span className="mt-1 block text-xs text-red-200">{error}</span>}
    </label>
  );
}

interface RoleSelectProps {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

function RoleSelect({ value, onChange, error }: RoleSelectProps) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-[#1a2e52]">
        User Type <span className="text-red-300">*</span>
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-full border-0 bg-white/80 px-5 py-2.5 text-sm text-slate-700 shadow-inner outline-none focus:ring-2 ${
          error ? 'ring-2 ring-red-400' : 'focus:ring-white/70'
        }`}
      >
        <option value="GENERAL">General</option>
        <option value="ADMIN">Admin</option>
      </select>
      {error && <span className="mt-1 block text-xs text-red-200">{error}</span>}
    </div>
  );
}
