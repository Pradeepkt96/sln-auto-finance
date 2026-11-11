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

For ₹10,000 in hand, the calculated loan amount is ₹12,222.22. Round the calculated loan amount to two decimal places before computing EMI with its existing rule, `(loanAmount * interestRate / 100) + loanAmount / installments`; round EMI to the nearest hundred. Interest rate and installment count affect EMI, not the current fixed-charge inversion.

## Validation and state

- Require a finite, positive in-hand amount, a finite, non-negative interest rate, and a positive integer installment count before calculation.
- Preserve the current form values and results when validation fails; present clear feedback.
- Switching modes must not reinterpret a value silently. The user enters an in-hand amount after switching to reverse mode.
- Preserve existing forward-mode results and behavior.

## Verification

- Confirm forward-mode calculation and displayed results remain unchanged.
- Confirm ₹10,000 in-hand produces a loan amount of ₹12,222.22.
- Confirm changing interest rate or installment count changes EMI while leaving the reverse-calculated loan amount unchanged.
- Confirm invalid or missing values do not produce success-shaped results.
