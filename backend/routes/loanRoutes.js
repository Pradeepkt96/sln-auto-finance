const express = require('express');
const { 
  getLoans, 
  createLoan, 
  updateLoanStatus, 
  updateLoan, 
  deleteLoan, 
  getLoanPayments, 
  updatePayment,
  recalculateDueDates,
} = require('../controllers/loanController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(protect, getLoans)
  .post(protect, createLoan);

router.route('/:id/recalculate-dues')
  .put(protect, recalculateDueDates);

router.route('/:id/payments')
  .get(protect, getLoanPayments);

router.route('/:id/status')
  .put(protect, updateLoanStatus);

router.route('/:id')
  .put(protect, updateLoan)
  .delete(protect, deleteLoan);

router.route('/payments/:id')
  .put(protect, updatePayment);

module.exports = router;
