const User = require('../models/User');
const OTP = require('../models/OTP');
const generateToken = require('../utils/generateToken');
const { sendOTP } = require('../services/otpService');

// @desc    Register a new user & request OTP
// @route   POST /api/auth/register
// @access  Public
const requestRegisterOTP = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('requestRegisterOTP error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Verify OTP and create user
// @route   POST /api/auth/verify-register
// @access  Public
const verifyRegisterOTP = async (req, res) => {
  try {
    const { username, mobile, otp, password, language, role } = req.body;

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
      username,
      mobile,
      password,
      language: language || 'en',
      role: role || 'staff',
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        mobile: user.mobile,
        role: user.role,
        language: user.language,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('verifyRegisterOTP error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
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

// @desc    Update user profile (username)
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { username } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username !== undefined) user.username = username;
    
    await user.save();
    
    res.json({
      _id: user._id,
      username: user.username,
      mobile: user.mobile,
      role: user.role,
      language: user.language,
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Change User Password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    // req.user is set by authMiddleware protect
    const user = await User.findById(req.user._id);

    if (user && (await user.matchPassword(oldPassword))) {
      user.password = newPassword;
      await user.save();
      res.json({ message: 'Password changed successfully' });
    } else {
      res.status(401).json({ message: 'Invalid old password' });
    }
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = {
  requestRegisterOTP,
  verifyRegisterOTP,
  loginUser,
  changePassword,
  updateProfile,
};
