const express = require('express');
const { getCustomers, createCustomer, updateCustomer, deleteCustomer } = require('../controllers/customerController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(protect, getCustomers)
  .post(protect, createCustomer);

router.route('/:id')
  .put(protect, updateCustomer)
  .delete(protect, deleteCustomer);

module.exports = router;
