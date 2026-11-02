const express = require('express');
const {
  requestRegisterOTP,
  getRegistrationOtpRequests,
  composeRegistrationOtpSms,
  verifyRegisterOTP,
  loginUser,
  getMe,
  changePassword,
  updateProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/register', requestRegisterOTP);
router.get('/registration-otp-requests', protect, authorizeRoles('admin'), getRegistrationOtpRequests);
router.post('/registration-otp-requests/:id/compose', protect, authorizeRoles('admin'), composeRegistrationOtpSms);
router.post('/verify-register', verifyRegisterOTP);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.put('/profile', protect, updateProfile);

module.exports = router;
