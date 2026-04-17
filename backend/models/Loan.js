const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    hpNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customerReference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    // Vehicle details
    vehicleNumber: {
      type: String,
      required: true,
    },
    make: {
      type: String,
      required: true, // e.g. Honda, TVS, Bajaj
    },
    vehicleModel: {
      type: String,
      required: true, // e.g. 01/2026
    },
    color: {
      type: String,
      default: '',
    },
    // Loan details
    loanAmount: {
      type: Number,
      required: true,
    },
    interestRate: {
      type: Number,
      required: true, // Annual Interest Rate
    },
    installments: {
      type: Number,
      required: true, // Number of months
    },
    emiAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'default'],
      default: 'active',
    },
    hpaDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Loan', loanSchema);
