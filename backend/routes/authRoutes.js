const express = require('express');
const {
  requestRegisterOTP,
  verifyRegisterOTP,
  loginUser,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', requestRegisterOTP);
router.post('/verify-register', verifyRegisterOTP);
router.post('/login', loginUser);
router.put('/change-password', protect, changePassword);

module.exports = router;
