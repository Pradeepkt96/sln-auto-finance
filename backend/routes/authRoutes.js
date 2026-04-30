const express = require('express');
const {
  requestRegisterOTP,
  verifyRegisterOTP,
  loginUser,
  getMe,
  changePassword,
  updateProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', requestRegisterOTP);
router.post('/verify-register', verifyRegisterOTP);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.put('/profile', protect, updateProfile);

module.exports = router;
