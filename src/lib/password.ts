export const MIN_PASSWORD = 8;

// What's wrong with a new password, or null when it's fine.
export function newPasswordProblem(current: string, next: string, again: string) {
  if (next.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (next === current) return 'Choose a password different from the current one.';
  if (next !== again) return "The two new passwords don't match.";
  return null;
}
