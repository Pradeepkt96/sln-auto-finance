const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getLoanFinancialValidationError,
  getPaymentFinancialValidationError,
  derivePaymentStatus,
} = require('../utils/loanValidation');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const User = require('../models/User');

test('user model includes viewer role', () => {
  assert.deepEqual(
    User.schema.path('role').enumValues,
    ['admin', 'staff', 'viewer', 'customer']
  );
});

test('loan financial values must be valid and EMI must cover principal', () => {
  const validLoan = {
    loanAmount: 12000,
    interestRate: 2,
    installments: 12,
    emiAmount: 1200,
  };

  assert.equal(getLoanFinancialValidationError(validLoan), null);
  assert.match(getLoanFinancialValidationError({ ...validLoan, loanAmount: -1 }), /Loan amount/);
  assert.match(getLoanFinancialValidationError({ ...validLoan, installments: 1.5 }), /whole number/);
  assert.match(getLoanFinancialValidationError({ ...validLoan, emiAmount: 999 }), /principal per installment/);
});

test('payment financial inputs reject negative, non-numeric and non-finite values', () => {
  assert.equal(getPaymentFinancialValidationError({ receivedAmount: 0, penalty: 0 }), null);
  assert.match(getPaymentFinancialValidationError({ receivedAmount: -1 }), /Received amount/);
  assert.match(getPaymentFinancialValidationError({ collectionCharges: Infinity }), /Collection charges/);
  assert.match(getPaymentFinancialValidationError({ penalty: '900' }), /Penalty/);
});

test('payment status is derived from receipt amount, preserving overdue when unpaid', () => {
  assert.equal(derivePaymentStatus(0, 1000, 'pending'), 'pending');
  assert.equal(derivePaymentStatus(0, 1000, 'overdue'), 'overdue');
  assert.equal(derivePaymentStatus(200, 1000, 'pending'), 'partially_paid');
  assert.equal(derivePaymentStatus(1000, 1000, 'pending'), 'paid');
});

test('staff-only authorization rejects customer roles and permits staff', () => {
  const authorizeStaff = authorizeRoles('admin', 'staff');
  let nextCalled = false;
  const response = {
    statusCode: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json() {},
  };

  authorizeStaff({ user: { role: 'customer' } }, response, () => { nextCalled = true; });
  assert.equal(response.statusCode, 403);
  assert.equal(nextCalled, false);

  authorizeStaff({ user: { role: 'staff' } }, response, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('viewer authorization permits reads and rejects write roles', () => {
  const authorizeRead = authorizeRoles('admin', 'staff', 'viewer');
  const authorizeWrite = authorizeRoles('admin', 'staff');

  let readNextCalled = false;
  let writeNextCalled = false;
  const response = {
    statusCode: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json() {},
  };

  authorizeRead({ user: { role: 'viewer' } }, response, () => { readNextCalled = true; });
  assert.equal(readNextCalled, true);

  authorizeWrite({ user: { role: 'viewer' } }, response, () => { writeNextCalled = true; });
  assert.equal(response.statusCode, 403);
  assert.equal(writeNextCalled, false);
});
