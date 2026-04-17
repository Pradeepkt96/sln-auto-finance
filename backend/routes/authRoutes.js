const express = require('express');
const {
  requestRegisterOTP,
  verifyRegisterOTP,
  loginUser,
  changePassword,
  updateProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', requestRegisterOTP);
router.post('/verify-register', verifyRegisterOTP);
router.post('/login', loginUser);
router.put('/change-password', protect, changePassword);
router.put('/profile', protect, updateProfile);

module.exports = router;
