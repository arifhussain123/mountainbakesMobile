/**
 * The strong-password policy, as the web's `utils/password.ts` and the API's
 * `StrongPasswordSchema` / `ChangePasswordSchema` state it: 8+ characters with
 * an uppercase letter, a lowercase letter, a number and a special character.
 * The server re-checks every rule; this only lets the form say so first.
 */

export interface PasswordCheck {
  label: string;
  passed: boolean;
}

/** Each rule with the web meter's label — in the schema's order, so the first failing one is the schema's first message. */
export function passwordChecks(pw: string): PasswordCheck[] {
  return [
    { label: 'At least 8 characters', passed: pw.length >= 8 },
    { label: 'One uppercase letter', passed: /[A-Z]/.test(pw) },
    { label: 'One lowercase letter', passed: /[a-z]/.test(pw) },
    { label: 'One number', passed: /[0-9]/.test(pw) },
    { label: 'One special character', passed: /[^A-Za-z0-9]/.test(pw) },
  ];
}

/** Number of satisfied rules, 0–5. */
export function passwordScore(pw: string): number {
  return passwordChecks(pw).filter((c) => c.passed).length;
}

export function isStrongPassword(pw: string): boolean {
  return pw.length > 0 && passwordScore(pw) === 5;
}

/** The web meter's strength word for a score. */
export const PASSWORD_STRENGTH_LABELS = ['Very weak', 'Very weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;

/** The meter's colour band: 0–1 danger, 2–3 warning, 4–5 success (the web's `BAR_COLOR`). */
export function passwordStrengthTone(score: number): 'danger' | 'warning' | 'success' {
  return score >= 4 ? 'success' : score >= 2 ? 'warning' : 'danger';
}

/**
 * `ChangePasswordSchema.safeParse` reduced to the message the web shows: the
 * first failing strength rule, else "Passwords do not match", else null.
 */
export function changePasswordProblem(newPassword: string, confirmPassword: string): string | null {
  const failed = passwordChecks(newPassword).find((c) => !c.passed);
  if (failed) return failed.label;
  if (newPassword !== confirmPassword) return 'Passwords do not match';
  return null;
}

/** The web's Update Password button: enabled only for a strong, matching password while nothing is in flight. */
export function canSubmitPasswordChange(newPassword: string, confirmPassword: string, submitting: boolean): boolean {
  return isStrongPassword(newPassword) && newPassword === confirmPassword && !submitting;
}
