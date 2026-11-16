const getLoanFinancialValidationError = ({ loanAmount, interestRate, installments, emiAmount }) => {
  if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
    return 'Loan amount must be a positive number';
  }
  if (!Number.isFinite(interestRate) || interestRate < 0) {
    return 'Interest rate must be a non-negative number';
  }
  if (!Number.isInteger(installments) || installments <= 0) {
    return 'Installments must be a positive whole number';
  }
  if (!Number.isFinite(emiAmount) || emiAmount <= 0) {
    return 'EMI amount must be a positive number';
  }
  if (emiAmount < loanAmount / installments) {
    return 'EMI amount cannot be less than the principal per installment';
  }
  return null;
};

const getPaymentFinancialValidationError = ({ receivedAmount, penalty, collectionCharges }) => {
  for (const [label, value] of [
    ['Received amount', receivedAmount],
    ['Penalty', penalty],
    ['Collection charges', collectionCharges],
  ]) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      return `${label} must be a non-negative number`;
    }
  }
  return null;
};

const derivePaymentStatus = (receivedAmount, dueAmount, currentStatus) => {
  if (receivedAmount >= dueAmount) return 'paid';
  if (receivedAmount > 0) return 'partially_paid';
  return currentStatus === 'overdue' ? 'overdue' : 'pending';
};

module.exports = {
  getLoanFinancialValidationError,
  getPaymentFinancialValidationError,
  derivePaymentStatus,
};
