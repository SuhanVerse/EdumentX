/**
 * Shared class strings for form inputs across the EdumentX auth flow.
 *
 * Centralising these constants keeps the input visual contract consistent
 * between `NameEmailFields`, the inline inputs on the profile screens, and
 * any new form fields. They compose with an `errorClass` appended:
 *
 *   `${INPUT_BASE} ${errors?.foo ? INPUT_ERROR : INPUT_OK}`
 *
 * Why a string constant (and not a `<TextInput>` wrapper component): RN
 * + NativeWind play nicest when `className` is a literal Tailwind class
 * string. Wrapping would force callers to thread `error` as a prop and
 * rebuild the className inside, which is what we're already doing in
 * `NameEmailFields`.
 */
export const INPUT_BASE =
  "min-h-btn px-4 border-emphasis rounded-card bg-surface text-body-lg text-text-primary";

export const INPUT_BORDER_OK = "border-border";
export const INPUT_BORDER_ERROR = "border-danger";
