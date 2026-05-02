import { useCallback, useState } from 'react';
import { ApiError } from '../api/client';
import { mapBackendError } from './validation';

/**
 * Reusable form-validation hook for enterprise-style inline validation.
 *
 * Behavior matches what users expect from polished business apps:
 *
 *   1. Errors do NOT show until the user has interacted with that field
 *      (`onBlur`) or has tried to submit.
 *   2. Once shown, errors update on every keystroke (so they clear as soon
 *      as the input becomes valid).
 *   3. On submit, every field is marked touched so all errors become
 *      visible at once, and validation runs synchronously.
 *   4. Backend errors are mapped — `details` from VALIDATION_FAILED go
 *      straight to per-field errors; known error codes are mapped to
 *      either a specific field (e.g. EMAIL_ALREADY_EXISTS → email) or
 *      to a form-level summary.
 *
 * Type `T` is the form values shape (typically a flat string record).
 */

type Errors<T> = Partial<Record<keyof T, string>>;
type Touched<T> = Partial<Record<keyof T, boolean>>;
type Validators<T> = Partial<Record<keyof T, (value: string, all: T) => string | null>>;

export interface UseFormValidationResult<T> {
  values: T;
  errors: Errors<T>;
  touched: Touched<T>;
  formError: string | null;

  /** Update a single field; clears its error if it has now become valid. */
  setValue: (field: keyof T, value: string) => void;
  /** Mark a field as touched so its error becomes visible. */
  blur: (field: keyof T) => void;
  /** Reset everything (values, errors, touched, formError). */
  reset: () => void;

  /**
   * Validate every field against its rules + extra cross-field rules.
   * Returns true when the form is valid. Marks every field touched so
   * errors become visible.
   */
  validateAll: (extraRules?: (values: T) => Errors<T>) => boolean;

  /**
   * Translate a server response into UI-visible errors:
   *   - `details` → per-field inline errors
   *   - mapped error code → either a field error or formError
   *   - unknown error → formError (with fallback message)
   */
  applyServerError: (err: unknown, fallbackMessage: string) => void;
}

// Accepts any object whose values are strings — including narrower
// union types like `'ADMIN' | 'GENERAL'` (which don't satisfy
// `Record<string, string>` directly).
export function useFormValidation<T extends { [K in keyof T]: string }>(
  initialValues: T,
  validators: Validators<T>,
): UseFormValidationResult<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Errors<T>>({});
  const [touched, setTouched] = useState<Touched<T>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const setValue = useCallback((field: keyof T, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      const rule = validators[field];
      if (rule) {
        const err = rule(value, next);
        setErrors((prevErrs) => ({ ...prevErrs, [field]: err ?? undefined }));
      }
      return next;
    });
    // Typing in any field clears the form-level error so stale messages
    // don't linger after the user has begun fixing the issue.
    setFormError(null);
  }, [validators]);

  const blur = useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const rule = validators[field];
    if (rule) {
      const err = rule(values[field], values);
      setErrors((prevErrs) => ({ ...prevErrs, [field]: err ?? undefined }));
    }
  }, [validators, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setFormError(null);
  }, [initialValues]);

  const validateAll = useCallback((extraRules?: (values: T) => Errors<T>): boolean => {
    const next: Errors<T> = {};
    for (const key of Object.keys(values) as (keyof T)[]) {
      const rule = validators[key];
      if (rule) {
        const err = rule(values[key], values);
        if (err) next[key] = err;
      }
    }
    if (extraRules) {
      const cross = extraRules(values);
      for (const key of Object.keys(cross) as (keyof T)[]) {
        const msg = cross[key];
        if (msg && !next[key]) next[key] = msg;
      }
    }
    setErrors(next);

    // Mark every field touched so all errors become visible.
    const allTouched: Touched<T> = {};
    for (const key of Object.keys(values) as (keyof T)[]) {
      allTouched[key] = true;
    }
    setTouched(allTouched);

    return Object.keys(next).length === 0;
  }, [validators, values]);

  const applyServerError = useCallback((err: unknown, fallbackMessage: string) => {
    if (!(err instanceof ApiError)) {
      setFormError(fallbackMessage);
      return;
    }
    // Per-field validation errors from the backend.
    if (err.body?.details) {
      const fieldErrs: Errors<T> = {};
      const allTouched: Touched<T> = {};
      for (const [k, v] of Object.entries(err.body.details)) {
        fieldErrs[k as keyof T] = v;
        allTouched[k as keyof T] = true;
      }
      setErrors(fieldErrs);
      setTouched((prev) => ({ ...prev, ...allTouched }));
      // VALIDATION_FAILED also produces a top-level summary.
      const mapped = mapBackendError(err.body?.code, fallbackMessage);
      setFormError(mapped.message);
      return;
    }
    // Single error code → either a field or the form-level summary.
    const mapped = mapBackendError(err.body?.code, err.body?.message ?? fallbackMessage);
    // Resolve the target field — handle the two "confirm" variants used
    // by signup vs change-password forms.
    let targetField: string | undefined = mapped.field;
    if (targetField === 'confirmPassword' && !(targetField in values)) {
      if ('confirmNewPassword' in values) targetField = 'confirmNewPassword';
    }
    if (targetField === 'oldPassword' && !(targetField in values)) {
      targetField = undefined;
    }
    if (targetField && targetField in values) {
      setErrors((prev) => ({ ...prev, [targetField as keyof T]: mapped.message }));
      setTouched((prev) => ({ ...prev, [targetField as keyof T]: true }));
      setFormError(null);
    } else {
      setFormError(mapped.message);
    }
  }, [values]);

  return {
    values, errors, touched, formError,
    setValue, blur, reset, validateAll, applyServerError,
  };
}
