import { ReactNode, useId } from 'react';

/**
 * Enterprise form field — text/password input with:
 *   - required-asterisk on the label
 *   - inline error (only when `touched && error`)
 *   - optional helper text below the input (always visible when no error)
 *   - red ring on error, accessible aria-invalid + aria-describedby wiring
 *
 * Pure presentational; pair with `useFormValidation` for state management.
 */

export interface FormFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
  touched?: boolean;
  helperText?: string;
  /** Optional icon or adornment rendered to the right inside the input ring. */
  rightSlot?: ReactNode;
  /** When true, render with the rounded "pill" style used on the LoginPage. */
  pill?: boolean;
}

export function FormField({
  label, value, onChange, onBlur,
  type = 'text', placeholder, autoComplete,
  required, error, touched, helperText, rightSlot,
  pill = false,
}: FormFieldProps) {
  const id = useId();
  const showError = !!(touched && error);
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const radius = pill ? 'rounded-full' : 'rounded-xl';
  const padding = pill ? 'px-5 py-3' : 'px-4 py-2.5';
  const labelSize = pill ? 'text-xs' : 'text-sm';

  return (
    <div className="block">
      <label
        htmlFor={id}
        className={`mb-1.5 block ${labelSize} font-medium text-[#1a2e52]`}
      >
        {label} {required && <span aria-hidden="true" className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={showError || undefined}
          aria-describedby={showError ? errorId : helperText ? helperId : undefined}
          aria-required={required || undefined}
          className={`
            w-full ${radius} border-0 bg-white/85 ${padding} text-sm text-slate-800
            placeholder-slate-400 shadow-inner outline-none transition
            focus:ring-2
            ${showError
              ? 'ring-2 ring-red-500 focus:ring-red-500'
              : 'focus:ring-[#1a2e52]/40'}
          `}
        />
        {rightSlot && (
          <div className="absolute inset-y-0 right-3 flex items-center text-[#1a2e52]/60">
            {rightSlot}
          </div>
        )}
      </div>

      {/* Error takes precedence over helper text */}
      {showError ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1 flex items-center gap-1 text-xs font-medium text-red-700"
        >
          <ErrorIcon />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="mt-1 text-xs text-[#1a2e52]/60">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

// ── Select with the same look ─────────────────────────────────────────────────

export interface FormSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
  touched?: boolean;
  helperText?: string;
}

export function FormSelect({
  label, value, onChange, onBlur, options,
  required, error, touched, helperText,
}: FormSelectProps) {
  const id = useId();
  const showError = !!(touched && error);
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#1a2e52]">
        {label} {required && <span aria-hidden="true" className="text-red-500">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={showError || undefined}
        aria-describedby={showError ? errorId : helperText ? helperId : undefined}
        aria-required={required || undefined}
        className={`
          w-full rounded-xl border-0 bg-white/85 px-4 py-2.5 text-sm text-slate-800
          shadow-inner outline-none transition focus:ring-2
          ${showError ? 'ring-2 ring-red-500 focus:ring-red-500' : 'focus:ring-[#1a2e52]/40'}
        `}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {showError ? (
        <p id={errorId} role="alert" className="mt-1 flex items-center gap-1 text-xs font-medium text-red-700">
          <ErrorIcon />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="mt-1 text-xs text-[#1a2e52]/60">{helperText}</p>
      ) : null}
    </div>
  );
}

// ── Form-level error summary ──────────────────────────────────────────────────

export function FormErrorSummary({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50/95 px-4 py-3 text-xs text-red-800"
    >
      <ErrorIcon />
      <span>{message}</span>
    </div>
  );
}

// ── Icon ──────────────────────────────────────────────────────────────────────

function ErrorIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-8-3.75a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6.25zm0 8a.9.9 0 100-1.8.9.9 0 000 1.8z"
        clipRule="evenodd"
      />
    </svg>
  );
}
