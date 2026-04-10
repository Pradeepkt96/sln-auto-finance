const express = require('express');
const {
  requestRegisterOTP,
  verifyRegisterOTP,
  loginUser,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', requestRegisterOTP);
router.post('/verify-register', verifyRegisterOTP);
router.post('/login', loginUser);

module.exports = router;
