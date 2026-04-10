const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiry: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Method to verify if OTP is still valid
otpSchema.methods.isValid = function () {
  return Date.now() < this.expiry.getTime() && !this.isUsed;
};

module.exports = mongoose.model('OTP', otpSchema);
