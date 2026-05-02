/**
 * Centralized field-validation rules.
 *
 * Each validator returns null when the value is OK, or a user-facing error
 * message string when it's invalid. Compose with `firstError(...)` to apply
 * multiple rules in order.
 *
 * Conventions:
 *   - Messages are full sentences, end with a period, and use the field
 *     label provided by the caller (so the same rule reads naturally in
 *     "Full name is required." and "Designation is required.").
 *   - Required values are checked first; subsequent rules assume the value
 *     is non-empty and may safely call `.length` etc. on it.
 *   - Length constraints match the backend Jakarta annotations exactly so
 *     server-side validation will agree.
 */

export type Validator = (value: string) => string | null;

/** Returns the first non-null error from the supplied validators, or null. */
export function firstError(value: string, ...validators: Validator[]): string | null {
  for (const v of validators) {
    const err = v(value);
    if (err) return err;
  }
  return null;
}

// ── Required ──────────────────────────────────────────────────────────────────

export const required = (label: string): Validator => (v) =>
  v.trim() === '' ? `${label} is required.` : null;

// ── Email ─────────────────────────────────────────────────────────────────────

// RFC-5322 simplified — same shape Jakarta @Email accepts. Doesn't validate
// the domain, just the syntactic shape.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const email = (): Validator => (v) =>
  v.trim() === '' ? null : EMAIL_RE.test(v.trim())
    ? null
    : 'Please enter a valid email address (e.g. name@example.com).';

// ── Length ────────────────────────────────────────────────────────────────────

export const minLength = (n: number, label: string): Validator => (v) =>
  v.length === 0 || v.length >= n
    ? null
    : `${label} must be at least ${n} characters.`;

export const maxLength = (n: number, label: string): Validator => (v) =>
  v.length <= n ? null : `${label} cannot exceed ${n} characters.`;

// ── Match (e.g. password === confirmPassword) ─────────────────────────────────

/** Returns a validator that passes only when `v === other`. */
export const matches = (other: string, otherLabel: string): Validator => (v) =>
  v === '' || v === other ? null : `Does not match ${otherLabel}.`;

// ── Pattern ───────────────────────────────────────────────────────────────────

export const pattern = (re: RegExp, message: string): Validator => (v) =>
  v === '' || re.test(v) ? null : message;

// ── Backend error code → user-facing message ─────────────────────────────────

/**
 * Maps backend AppException codes to a UX-friendly message AND, where
 * possible, the specific field the error belongs to. Pages call this with
 * the backend `code` and the form's known field names, and place the
 * message either inline on a field or in the form-level summary.
 */
export interface BackendErrorMapping {
  /** If set, the message belongs on this field (inline). */
  field?: string;
  /** Always set — falls back to a generic message if code is unknown. */
  message: string;
}

export function mapBackendError(
  code: string | undefined,
  fallbackMessage: string,
): BackendErrorMapping {
  switch (code) {
    case 'EMAIL_ALREADY_EXISTS':
      return {
        field: 'email',
        message: 'An account with this email already exists. Please sign in or use a different email.',
      };
    case 'INVALID_CREDENTIALS':
      return {
        message: 'The email or password you entered is incorrect.',
      };
    case 'OLD_PASSWORD_INVALID':
      return {
        field: 'oldPassword',
        message: 'The current password you entered is incorrect.',
      };
    case 'PASSWORD_MISMATCH':
      return {
        field: 'confirmPassword',
        message: 'Passwords do not match.',
      };
    case 'ACCOUNT_LOCKED':
      return {
        message: 'This account is temporarily locked due to too many failed login attempts. Please try again in a few minutes.',
      };
    case 'ACCOUNT_NOT_ACTIVATED':
      return {
        message: 'Your account is not yet activated. Please ask an Administrator to activate your account.',
      };
    case 'SESSION_TIMED_OUT':
      return {
        message: 'Your session has expired. Please sign in again.',
      };
    case 'FORBIDDEN':
      return {
        message: 'You do not have permission to perform this action.',
      };
    case 'VALIDATION_FAILED':
      return {
        message: 'Some fields are invalid. Please review the errors below and try again.',
      };
    case 'INTERNAL_ERROR':
      return {
        message: 'A server error occurred. Please try again in a moment.',
      };
    default:
      return { message: fallbackMessage };
  }
}
