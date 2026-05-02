import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signup } from '../api/auth';
import { PageShell } from '../components/PageShell';
import { FormField, FormSelect, FormErrorSummary } from '../components/FormField';
import { useFormValidation } from '../lib/useFormValidation';
import { email, firstError, maxLength, minLength, required } from '../lib/validation';

interface SignupValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  address: string;
  designation: string;
  role: 'ADMIN' | 'GENERAL' | string;
}

const initial: SignupValues = {
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
  const [submitting, setSubmitting] = useState(false);

  const {
    values, errors, touched, formError,
    setValue, blur, validateAll, applyServerError,
  } = useFormValidation<SignupValues>(initial, {
    name: (v) => firstError(v,
      required('Full Name'),
      minLength(2, 'Full Name'),
      maxLength(120, 'Full Name'),
    ),
    email: (v) => firstError(v,
      required('Email'),
      email(),
      maxLength(254, 'Email'),
    ),
    password: (v) => firstError(v,
      required('Password'),
      minLength(8, 'Password'),
      maxLength(200, 'Password'),
    ),
    confirmPassword: (v, all) => firstError(v,
      required('Confirm Password'),
    ) ?? (v !== all.password ? 'Passwords do not match.' : null),
    address: (v) => firstError(v,
      required('Address'),
      maxLength(500, 'Address'),
    ),
    designation: (v) => firstError(v,
      required('Designation'),
      minLength(2, 'Designation'),
      maxLength(120, 'Designation'),
    ),
    role: (v) => required('User Type')(v),
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateAll()) return;

    setSubmitting(true);
    try {
      await signup({
        ...values,
        role: values.role as 'ADMIN' | 'GENERAL',
      });
      navigate('/?msg=' + encodeURIComponent('Account created! Please sign in.'));
    } catch (err) {
      applyServerError(err, 'Sign-up failed. Please try again.');
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
            <FormField
              label="Full Name"
              value={values.name}
              onChange={(v) => setValue('name', v)}
              onBlur={() => blur('name')}
              error={errors.name}
              touched={touched.name}
              autoComplete="name"
              placeholder="Jane Doe"
              required
            />

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

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField
                label="Password"
                type="password"
                value={values.password}
                onChange={(v) => setValue('password', v)}
                onBlur={() => blur('password')}
                error={errors.password}
                touched={touched.password}
                autoComplete="new-password"
                helperText="At least 8 characters."
                required
              />
              <FormField
                label="Confirm Password"
                type="password"
                value={values.confirmPassword}
                onChange={(v) => setValue('confirmPassword', v)}
                onBlur={() => blur('confirmPassword')}
                error={errors.confirmPassword}
                touched={touched.confirmPassword}
                autoComplete="new-password"
                required
              />
            </div>

            <FormField
              label="Address"
              value={values.address}
              onChange={(v) => setValue('address', v)}
              onBlur={() => blur('address')}
              error={errors.address}
              touched={touched.address}
              autoComplete="street-address"
              placeholder="Street, city, postal code"
              required
            />

            <FormField
              label="Designation"
              value={values.designation}
              onChange={(v) => setValue('designation', v)}
              onBlur={() => blur('designation')}
              error={errors.designation}
              touched={touched.designation}
              placeholder="e.g. Software Engineer"
              required
            />

            <FormSelect
              label="User Type"
              value={values.role}
              onChange={(v) => setValue('role', v)}
              onBlur={() => blur('role')}
              error={errors.role}
              touched={touched.role}
              options={[
                { value: 'GENERAL', label: 'General' },
                { value: 'ADMIN', label: 'Admin' },
              ]}
              required
            />
          </div>

          <FormErrorSummary message={formError} />

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
