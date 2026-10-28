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
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.route('/')
  .get(protect, getLoans)
  .post(protect, authorizeRoles('admin'), createLoan);

router.route('/:id/recalculate-dues')
  .put(protect, authorizeRoles('admin', 'staff'), recalculateDueDates);

router.route('/:id/payments')
  .get(protect, getLoanPayments);

router.route('/:id/status')
  .put(protect, authorizeRoles('admin', 'staff'), updateLoanStatus);

router.route('/:id')
  .put(protect, authorizeRoles('admin', 'staff'), updateLoan)
  .delete(protect, authorizeRoles('admin'), deleteLoan);

router.route('/payments/:id')
  .put(protect, authorizeRoles('admin', 'staff'), updatePayment);

module.exports = router;
