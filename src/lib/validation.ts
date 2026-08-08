/**
 * EdumentX — Shared Validation Utilities
 *
 * Single source of truth for all form-validation logic used across
 * Student, Tutor, and Admin profile screens. Keeps regex patterns,
 * error messages, and validation functions in one place so the three
 * profile screens never disagree about what a valid phone number or
 * username looks like.
 *
 * Each validator returns `null` when the value is valid, or a
 * user-facing error string when invalid. This way the caller can
 * simply write:
 *
 *   const phoneErr = validatePhone(phone);
 *   if (phoneErr) errors.phone = phoneErr;
 *
 * and never needs to import regex patterns or duplicate messages.
 */

// ─── Constants ──────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;

/**
 * Nepali mobile number validation.
 *
 * Requirements:
 *   - Exactly 10 digits
 *   - Must start with 98 or 97 (Nepali mobile prefixes)
 *   - Digits only — no spaces, dashes, or special characters
 *
 * The regex matches:
 *   ^          start
 *   (98|97)    prefix — the two valid Nepali mobile prefixes
 *   \d{8}      exactly 8 more digits (total = 10)
 *   $          end
 */
const PHONE_REGEX = /^(98|97)\d{8}$/;

/**
 * Full-name validation for Nepali / English names.
 * Allows letters, spaces, dots, apostrophes, and hyphens.
 * Length: 2–80 characters (after trim).
 */
const NAME_REGEX = /^[a-zA-Z\s.'-]{2,80}$/;

// ─── Validators ─────────────────────────────────────────────────────────────

/**
 * Validate a mobile phone number.
 * @returns `null` if valid, or an error string.
 */
export function validatePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (trimmed.length === 0) return "Enter your phone number.";
  if (!/^\d+$/.test(trimmed)) return "Use digits only — no spaces, dashes, or symbols.";
  if (trimmed.length !== 10) return "Phone number must be exactly 10 digits.";
  if (!PHONE_REGEX.test(trimmed))
    return "Phone number must start with 98 or 97 (e.g. 98XXXXXXXX).";
  return null;
}

/**
 * Validate a full name.
 * @returns `null` if valid, or an error string.
 */
export function validateFullName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "Enter your full name.";
  if (trimmed.length < 2) return "Name must be at least 2 characters.";
  if (!NAME_REGEX.test(trimmed))
    return "Use letters, spaces, dots, apostrophes, or hyphens only.";
  return null;
}

/**
 * Validate a username (handle).
 * @returns `null` if valid, or an error string.
 */
export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (trimmed.length === 0) return "Enter a username (3–30 characters: letters, digits, underscore, or dot).";
  if (!USERNAME_REGEX.test(trimmed))
    return "Username must be 3–30 characters: letters, digits, underscore, or dot.";
  return null;
}

/**
 * Validate an email address.
 * @returns `null` if valid, or an error string.
 */
export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (trimmed.length === 0) return "Email is required.";
  if (!EMAIL_REGEX.test(trimmed)) return "Enter a valid email address.";
  return null;
}

/**
 * Validate that a value is non-empty after trimming.
 * @param value The value to check.
 * @param label Human-readable field name for the error message.
 * @returns `null` if valid, or an error string.
 */
export function validateRequired(value: string, label: string): string | null {
  if (value.trim().length === 0) return `Enter your ${label}.`;
  return null;
}

/**
 * Validate a degree / qualification field.
 * Allows letters, spaces, dots, commas, parentheses, slashes, hyphens, and ampersands.
 * Length: 2–120 characters (after trim).
 * @returns `null` if valid, or an error string.
 */
export function validateDegree(degree: string): string | null {
  const trimmed = degree.trim();
  if (trimmed.length === 0) return "Enter your highest degree or qualification.";
  if (trimmed.length < 2) return "Degree must be at least 2 characters.";
  // Letters, spaces, dots, commas, parens, slashes, hyphens, ampersands, apostrophes.
  if (!/^[a-zA-Z\s.,()\/\-&']+$/.test(trimmed))
    return "Use letters and common punctuation only (e.g. B.Sc., M.Ed.).";
  return null;
}

/**
 * Validate an institution / university name.
 * Allows letters, spaces, dots, commas, parentheses, slashes, hyphens, and ampersands.
 * Length: 2–120 characters (after trim).
 * @returns `null` if valid, or an error string.
 */
export function validateInstitution(institution: string): string | null {
  const trimmed = institution.trim();
  if (trimmed.length === 0) return "Enter the name of your institution.";
  if (trimmed.length < 2) return "Institution name must be at least 2 characters.";
  // Letters, spaces, dots, commas, parens, slashes, hyphens, ampersands, apostrophes.
  if (!/^[a-zA-Z\s.,()\/\-&']+$/.test(trimmed))
    return "Use letters and common punctuation only (e.g. Tribhuvan University).";
  return null;
}

/**
 * Validate a checkbox/chip selection has at least one item.
 * @param items The selected array.
 * @param label Human-readable label for the error message.
 * @returns `null` if valid, or an error string.
 */
export function validateSelection<T>(items: T[], label: string): string | null {
  if (items.length < 1) return `Select at least one ${label}.`;
  return null;
}
