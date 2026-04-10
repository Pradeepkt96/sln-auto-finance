const express = require('express');
const { getLoans, createLoan, updateLoanStatus } = require('../controllers/loanController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(protect, getLoans)
  .post(protect, createLoan);

router.route('/:id/status')
  .put(protect, updateLoanStatus);

module.exports = router;
