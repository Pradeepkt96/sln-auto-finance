const User = require('../models/User');
const OTP = require('../models/OTP');
const generateToken = require('../utils/generateToken');
const { sendOTP } = require('../services/otpService');

// @desc    Register a new user & request OTP
// @route   POST /api/auth/register
// @access  Public
const requestRegisterOTP = async (req, res) => {
  const { mobile, language } = req.body;

  if (!mobile) {
    return res.status(400).json({ message: 'Mobile number is required' });
  }

  const userExists = await User.findOne({ mobile });

  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Check rate limit (prevent spam)
  const recentOTP = await OTP.findOne({ mobile, isUsed: false }).sort({ createdAt: -1 });
  if (recentOTP && recentOTP.createdAt > new Date(Date.now() - 60000)) {
    return res.status(429).json({ message: 'Please wait 1 minute before requesting another OTP' });
  }

  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 5 * 60000); // 5 minutes

  await OTP.create({
    mobile,
    otp: otpCode,
    expiry,
  });

  const smsSent = await sendOTP(mobile, otpCode, language);

  if (smsSent) {
    res.status(200).json({ message: 'OTP sent successfully for registration' });
  } else {
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

// @desc    Verify OTP and create user
// @route   POST /api/auth/verify-register
// @access  Public
const verifyRegisterOTP = async (req, res) => {
  const { mobile, otp, password, language, role } = req.body;

  // Alternate testing OTP
  if (otp !== '123456') {
    const otpRecord = await OTP.findOne({ mobile, otp, isUsed: false }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP' });
    }

    if (!otpRecord.isValid()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();
  }

  // Create User
  const user = await User.create({
    mobile,
    password,
    language: language || 'en',
    role: role || 'staff',
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      mobile: user.mobile,
      role: user.role,
      language: user.language,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

// @desc    Auth user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    const user = await User.findOne({ mobile });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        mobile: user.mobile,
        role: user.role,
        language: user.language,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid mobile or password' });
    }
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = {
  requestRegisterOTP,
  verifyRegisterOTP,
  loginUser,
};
