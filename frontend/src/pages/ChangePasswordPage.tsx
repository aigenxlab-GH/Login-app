import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../api/auth';
import { PageShell } from '../components/PageShell';
import { FormField, FormErrorSummary } from '../components/FormField';
import { useFormValidation } from '../lib/useFormValidation';
import { email, firstError, maxLength, minLength, required } from '../lib/validation';

interface ChangePwValues {
  email: string;
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

const initial: ChangePwValues = {
  email: '',
  oldPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    values, errors, touched, formError,
    setValue, blur, validateAll, applyServerError,
  } = useFormValidation<ChangePwValues>(initial, {
    email: (v) => firstError(v, required('Email'), email()),
    oldPassword: (v) => required('Current Password')(v),
    newPassword: (v, all) => firstError(v,
      required('New Password'),
      minLength(8, 'New Password'),
      maxLength(200, 'New Password'),
    ) ?? (v === all.oldPassword
        ? 'New password must be different from your current password.'
        : null),
    confirmNewPassword: (v, all) => firstError(v,
      required('Confirm New Password'),
    ) ?? (v !== all.newPassword ? 'Passwords do not match.' : null),
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateAll()) return;

    setSubmitting(true);
    try {
      await changePassword(values);
      navigate('/?msg=' + encodeURIComponent('Password successfully changed'));
    } catch (err) {
      applyServerError(err, 'Could not change password. Please try again.');
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
            <FormField
              label="Email"
              type="email"
              value={values.email}
              onChange={(v) => setValue('email', v)}
              onBlur={() => blur('email')}
              error={errors.email}
              touched={touched.email}
              autoComplete="email"
              placeholder="name@example.com"
              required
            />
            <FormField
              label="Current Password"
              type="password"
              value={values.oldPassword}
              onChange={(v) => setValue('oldPassword', v)}
              onBlur={() => blur('oldPassword')}
              error={errors.oldPassword}
              touched={touched.oldPassword}
              autoComplete="current-password"
              required
            />
            <FormField
              label="New Password"
              type="password"
              value={values.newPassword}
              onChange={(v) => setValue('newPassword', v)}
              onBlur={() => blur('newPassword')}
              error={errors.newPassword}
              touched={touched.newPassword}
              autoComplete="new-password"
              helperText="At least 8 characters; must differ from current password."
              required
            />
            <FormField
              label="Confirm New Password"
              type="password"
              value={values.confirmNewPassword}
              onChange={(v) => setValue('confirmNewPassword', v)}
              onBlur={() => blur('confirmNewPassword')}
              error={errors.confirmNewPassword}
              touched={touched.confirmNewPassword}
              autoComplete="new-password"
              required
            />
          </div>

          <FormErrorSummary message={formError} />

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
