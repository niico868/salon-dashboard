import { newPasswordProblem } from '../password';

test('a new password must be long enough, new, and typed the same twice', () => {
  expect(newPasswordProblem('old-pass-1', 'short', 'short')).toMatch(/at least 8/);
  expect(newPasswordProblem('same-pass-1', 'same-pass-1', 'same-pass-1')).toMatch(/different/);
  expect(newPasswordProblem('old-pass-1', 'new-pass-12', 'new-pass-13')).toMatch(/match/);
  expect(newPasswordProblem('old-pass-1', 'new-pass-12', 'new-pass-12')).toBeNull();
});
