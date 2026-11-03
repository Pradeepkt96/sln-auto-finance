const isPasswordValid = (password, username) => (
  typeof password === 'string'
  && password.length >= 8
  && /[A-Z]/.test(password)
  && /\d/.test(password)
  && /[^A-Za-z0-9\s]/.test(password)
  && (
    typeof username !== 'string'
    || !username.trim()
    || password.toLowerCase() !== username.trim().toLowerCase()
  )
);

module.exports = { isPasswordValid };
