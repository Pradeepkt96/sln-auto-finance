const LEGACY_NAME_PATTERN = /^(?:([A-Za-z])\.?\s+)(.+)$/;

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

const parseLegacyName = (name) => {
  const cleanedName = cleanText(name);
  const match = cleanedName.match(LEGACY_NAME_PATTERN);

  if (!match) {
    return { firstName: cleanedName, initial: '', fatherName: '' };
  }

  const [, initial, remainingName] = match;
  const nameParts = remainingName.split(/\s+/);
  return {
    firstName: nameParts[0],
    initial,
    fatherName: nameParts.slice(1).join(' '),
  };
};

const normalizeCustomerName = (customer = {}) => {
  const firstName = cleanText(customer.firstName);
  const initial = cleanText(customer.initial).replace(/\.$/, '');
  const fatherName = cleanText(customer.fatherName);

  if (firstName || initial || fatherName) {
    return { firstName, initial, fatherName };
  }

  return parseLegacyName(customer.name);
};

const getCustomerDisplayName = (customer = {}) => {
  const { firstName, initial } = normalizeCustomerName(customer);
  if (!firstName && !initial) return cleanText(customer.name);
  return initial ? `${initial}. ${firstName}` : firstName;
};

const validateFatherName = (value) => {
  const fatherName = cleanText(value);
  return fatherName.length > 0 && /^[\p{L}]+(?:[-'][\p{L}]+)*$/u.test(fatherName);
};

module.exports = {
  getCustomerDisplayName,
  normalizeCustomerName,
  validateFatherName,
};
