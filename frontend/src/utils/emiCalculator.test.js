import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAmountInHand,
  calculateEmi,
  calculateLoanAmountFromHand,
} from './emiCalculator.js';

test('preserves the forward EMI and amount-in-hand calculations', () => {
  assert.equal(calculateEmi(50000, 2, 12), 5200);
  assert.equal(calculateAmountInHand(50000), 44000);
});

test('inverts current charges and rounds the reverse loan amount to nearest thousand', () => {
  assert.equal(calculateLoanAmountFromHand(10000), 12000);
});

test('rounds reverse EMI up to nearest hundred and keeps forward EMI nearest hundred', () => {
  const loanAmount = calculateLoanAmountFromHand(10000);

  assert.equal(calculateEmi(loanAmount, 2, 10, 100, 'up'), 1500);
  assert.notEqual(calculateEmi(loanAmount, 2, 10, 100, 'up'), calculateEmi(loanAmount, 10, 10, 100, 'up'));
  assert.notEqual(calculateEmi(loanAmount, 2, 10, 100, 'up'), calculateEmi(loanAmount, 2, 2, 100, 'up'));
  assert.equal(calculateEmi(12000, 2, 10, 100, 'up'), 1500);
  assert.equal(calculateEmi(12000, 2, 10, 100, 'nearest'), 1400);
  assert.equal(calculateEmi(50000, 2, 12), 5200);
  assert.equal(calculateAmountInHand(loanAmount), 9800);
});

test('accepts zero interest and rejects invalid calculation inputs', () => {
  assert.equal(calculateEmi(12000, 0, 12), 1000);
  assert.equal(calculateEmi(0, 2, 12), null);
  assert.equal(calculateEmi(12000, -1, 12), null);
  assert.equal(calculateEmi(12000, 2, 0), null);
  assert.equal(calculateEmi(12000, 2, 1.5), null);
  assert.equal(calculateLoanAmountFromHand(0), null);
  assert.equal(calculateLoanAmountFromHand(Number.POSITIVE_INFINITY), null);
});
