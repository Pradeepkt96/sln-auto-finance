const { randomInt } = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const generateToken = require('../utils/generateToken');
const { isPasswordValid } = require('../utils/passwordPolicy');

// @desc    Register a new user & request OTP
// @route   POST /api/auth/register
// @access  Public
const requestRegisterOTP = async (req, res) => {
  try {
    const { mobile, language } = req.body;

    if (!mobile) {
      return res.status(400).json({ message: 'Mobile number is required' });
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number' });
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
    const otpCode = randomInt(100000, 1000000).toString();
    const expiry = new Date(Date.now() + 5 * 60000); // 5 minutes

    await OTP.updateMany({ mobile, isUsed: false }, { $set: { isUsed: true } });
    await OTP.create({
      mobile,
      otp: otpCode,
      expiry,
      language: language === 'ta' ? 'ta' : 'en',
    });

    res.status(200).json({ message: 'Registration request received. An admin must send your OTP by SMS.' });
  } catch (error) {
    console.error('requestRegisterOTP error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const getRegistrationOtpRequests = async (req, res) => {
  try {
    const requests = await OTP.find({
      isUsed: false,
      expiry: { $gt: new Date() },
      attempts: { $lt: 5 },
    })
      .sort({ createdAt: -1 })
      .select('mobile language createdAt expiry manualSmsPreparedAt')
      .lean();
    res.json(requests);
  } catch (error) {
    console.error('Failed to fetch registration OTP requests:', error);
    res.status(500).json({ message: 'Failed to fetch registration OTP requests' });
  }
};

const composeRegistrationOtpSms = async (req, res) => {
  try {
    const otpRecord = await OTP.findOne({
      _id: req.params.id,
      isUsed: false,
      expiry: { $gt: new Date() },
      attempts: { $lt: 5 },
    });
    if (!otpRecord) {
      return res.status(404).json({ message: 'Registration OTP request is no longer active' });
    }

    otpRecord.manualSmsPreparedAt = new Date();
    await otpRecord.save();

    const message = otpRecord.language === 'ta'
      ? `ஸ்ரீ லட்சுமி நாராயணா ஆட்டோ ஃபைனான்ஸ் பதிவு OTP: ${otpRecord.otp}. இது 5 நிமிடங்களுக்கு செல்லுபடியாகும். யாருடனும் பகிர வேண்டாம்.`
      : `Sri Lakshmi Narayana Auto Finance registration OTP: ${otpRecord.otp}. Valid for 5 minutes. Do not share it.`;

    res.json({
      mobile: otpRecord.mobile,
      smsUrl: `sms:+91${otpRecord.mobile}?body=${encodeURIComponent(message)}`,
      preparedAt: otpRecord.manualSmsPreparedAt,
    });
  } catch (error) {
    console.error('Failed to prepare registration OTP SMS:', error);
    res.status(500).json({ message: 'Failed to prepare registration OTP SMS' });
  }
};

// @desc    Verify OTP and create user
// @route   POST /api/auth/verify-register
// @access  Public
const verifyRegisterOTP = async (req, res) => {
  try {
    const { username, mobile, otp, password, language } = req.body;

    if (!isPasswordValid(password, username)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include an uppercase letter, a number, and a special character. It must not match your username.',
      });
    }

    const otpRecord = await OTP.findOne({ mobile, isUsed: false }).sort({ createdAt: -1 });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (otpRecord.attempts >= 5) {
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP' });
    }
    if (!otpRecord.isValid()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      if (otpRecord.attempts >= 5) otpRecord.isUsed = true;
      await otpRecord.save();
      return res.status(400).json({
        message: otpRecord.isUsed
          ? 'Too many failed attempts. Please request a new OTP'
          : 'Invalid OTP',
      });
    }

    otpRecord.isUsed = true;
    await otpRecord.save();

    // Create User
    const user = await User.create({
      username,
      mobile,
      password,
      language: language || 'en',
      role: 'staff',
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
      if (user.role === 'customers') {
        user.role = 'customer';
        await User.updateOne({ _id: user._id }, { $set: { role: 'customer' } });
      }
      res.json({
        _id: user._id,
        username: user.username,
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

// @desc    Get current logged-in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      _id: user._id,
      username: user.username,
      mobile: user.mobile,
      role: user.role,
      language: user.language,
    });
  } catch (error) {
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

    if (!isPasswordValid(newPassword, req.user.username)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include an uppercase letter, a number, and a special character. It must not match your username.',
      });
    }
    
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
  getRegistrationOtpRequests,
  composeRegistrationOtpSms,
  verifyRegisterOTP,
  loginUser,
  getMe,
  changePassword,
  updateProfile,
};
