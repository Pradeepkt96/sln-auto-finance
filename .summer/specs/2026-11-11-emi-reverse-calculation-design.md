# EMI Calculator Reverse Calculation Design

## Goal

Allow a user to enter the amount they want to receive in hand and calculate the corresponding loan amount and EMI in the EMI Calculator tab.

## User experience

- Add a reverse-mode toggle symbol beside the amount input.
- In forward mode, preserve the current `Loan Amount` input, `Calculate EMI` behavior, and results.
- In reverse mode, label the input `Amount in Hand`. Keep interest rate and installment count editable.
- Submitting the existing calculator form in reverse mode computes and displays the loan amount and EMI.
- Toggling modes clears the amount and previous results so a value is never silently reinterpreted with a different meaning.

## Calculation

The current forward charge rule is:

`amountInHand = loanAmount - (loanAmount * 0.1 + 1000)`

Reverse mode solves that rule:

`loanAmount = (amountInHand + 1000) / 0.9`

For reverse mode, round the calculated loan amount to the nearest ₹1,000 before computing EMI. Compute EMI with the existing rule, `(loanAmount * interestRate / 100) + loanAmount / installments`, then always round the reverse-mode EMI up to the next ₹100 (an exact multiple of ₹100 remains unchanged). For ₹10,000 in hand, the unrounded loan amount is ₹12,222.22, the displayed loan amount is ₹12,000, and at 2% for 10 installments the EMI is ₹1,440 rounded up to ₹1,500. Show the actual in-hand amount after loan rounding: ₹9,800 in this example. Interest rate and installment count affect EMI, not the fixed-charge inversion.

Forward mode must retain its current loan amount and nearest-₹100 EMI behavior (standard nearest rounding, not always upward).

## Validation and state

- Require a finite, positive in-hand amount, a finite, non-negative interest rate, and a positive integer installment count before calculation.
- Preserve the current form values and results when validation fails; present clear feedback.
- Switching modes must not reinterpret a value silently. The user enters an in-hand amount after switching to reverse mode.
- Preserve existing forward-mode results and behavior.

## Verification

- Confirm forward-mode calculation and displayed results remain unchanged.
- Confirm ₹10,000 in-hand at 2% for 10 installments produces a loan amount of ₹12,000, an EMI of ₹1,000, and actual in-hand of ₹9,800.
- Confirm reverse mode rounds loan amount to nearest ₹1,000 and rounds EMI up to the next ₹100, while changing interest rate or installment count changes EMI but not loan amount.
- Confirm forward mode continues to round EMI to the nearest ₹100.
- Confirm invalid or missing values do not produce success-shaped results.
