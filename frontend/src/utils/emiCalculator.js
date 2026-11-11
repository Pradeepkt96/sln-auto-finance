export function calculateEmi(
  amount,
  interestRate,
  installments,
  roundingUnit = 100,
  roundingMode = 'nearest',
) {
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isFinite(interestRate) ||
    interestRate < 0 ||
    !Number.isInteger(installments) ||
    installments <= 0 ||
    !Number.isFinite(roundingUnit) ||
    roundingUnit <= 0 ||
    !['nearest', 'up'].includes(roundingMode)
  ) {
    return null;
  }

  const emi = amount * interestRate / 100 + amount / installments;
  const roundingFunction = roundingMode === 'up' ? Math.ceil : Math.round;
  return roundingFunction(emi / roundingUnit) * roundingUnit;
}

export function calculateAmountInHand(loanAmount) {
  if (!Number.isFinite(loanAmount)) {
    return null;
  }

  return Number((loanAmount - (loanAmount * 0.1 + 1000)).toFixed(2));
}

export function calculateLoanAmountFromHand(amountInHand) {
  if (!Number.isFinite(amountInHand) || amountInHand <= 0) {
    return null;
  }

  return Math.round(((amountInHand + 1000) / 0.9) / 1000) * 1000;
}
