export const getPasswordStrength = (password, username = '') => {
  const checks = [
    { key: 'passwordLengthRequirement', valid: password.length >= 8 },
    { key: 'passwordUppercaseRequirement', valid: /[A-Z]/.test(password) },
    { key: 'passwordNumberRequirement', valid: /\d/.test(password) },
    { key: 'passwordSymbolRequirement', valid: /[^A-Za-z0-9\s]/.test(password) },
    {
      key: 'passwordNotUsernameRequirement',
      valid: password.length > 0
        && (!username.trim() || password.toLowerCase() !== username.trim().toLowerCase()),
    },
  ];
  const score = checks.filter(({ valid }) => valid).length;
  const strength = !password ? 'empty' : score < 3 ? 'weak' : score < checks.length ? 'fair' : 'strong';

  return {
    checks,
    score,
    strength,
    isValid: score === checks.length,
  };
};
