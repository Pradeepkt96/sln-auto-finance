const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    slNo: {
      type: Number,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    altMobile: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: true,
    },
    // Photo URL stored after Cloudinary upload
    photoUrl: {
      type: String,
      required: false,
    },
    // Cloudinary public id for the uploaded image (useful for deletions/updates)
    photoPublicId: {
      type: String,
      required: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
