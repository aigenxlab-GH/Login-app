import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { changePassword } from '../api/auth';
import { PageShell } from '../components/PageShell';

interface FormState {
  email: string;
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

const initial: FormState = {
  email: '',
  oldPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

export function ChangePasswordPage() {
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
    if (!form.email.trim()) local.email = 'Required';
    if (!form.oldPassword) local.oldPassword = 'Required';
    if (!form.newPassword) local.newPassword = 'Required';
    if (!form.confirmNewPassword) local.confirmNewPassword = 'Required';

    const fieldLabels: Record<string, string> = {
      email: 'Email',
      oldPassword: 'Old Password',
      newPassword: 'New Password',
      confirmNewPassword: 'Confirm New Password',
    };
    const missing = Object.keys(local).map((k) => fieldLabels[k]);
    if (missing.length > 0) {
      setFieldErrors(local);
      setGeneralError(`Please fill the ${missing.join(', ')}.`);
      return;
    }

    // Business rule checks
    if (form.newPassword.length < 8) {
      local.newPassword = 'New password must be at least 8 characters.';
    }
    if (form.newPassword !== form.confirmNewPassword) {
      local.confirmNewPassword = 'Passwords do not match.';
    }
    if (Object.keys(local).length > 0) {
      setFieldErrors(local);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      await changePassword(form);
      navigate('/?msg=' + encodeURIComponent('Password successfully changed'));
    } catch (err) {
      if (err instanceof ApiError && err.body?.details) {
        setFieldErrors(err.body.details);
      } else if (err instanceof ApiError) {
        setGeneralError(err.body?.message ?? 'Could not change password. Please try again.');
      } else {
        setGeneralError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#1a2e52]">Change password</h1>
          <p className="mt-2 text-sm text-white/80">Update your account password</p>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="rounded-3xl bg-white/30 p-8 shadow-xl backdrop-blur-md ring-1 ring-white/50"
        >
          <div className="space-y-5">
            <Field label="Email" type="email" value={form.email} onChange={(v) => update('email', v)}
              error={fieldErrors.email} autoComplete="email" required />
            <Field label="Old Password" type="password" value={form.oldPassword}
              onChange={(v) => update('oldPassword', v)} error={fieldErrors.oldPassword}
              autoComplete="current-password" required />
            <Field label="New Password" type="password" value={form.newPassword}
              onChange={(v) => update('newPassword', v)} error={fieldErrors.newPassword}
              autoComplete="new-password" required />
            <Field label="Confirm New Password" type="password" value={form.confirmNewPassword}
              onChange={(v) => update('confirmNewPassword', v)} error={fieldErrors.confirmNewPassword}
              autoComplete="new-password" required />
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
            {submitting ? 'Saving…' : 'Change Password'}
          </button>

          <p className="mt-5 border-t border-white/30 pt-5 text-center text-sm text-[#1a2e52]">
            <button type="button" className="font-semibold hover:underline" onClick={() => navigate('/')}>
              Back to sign in
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
