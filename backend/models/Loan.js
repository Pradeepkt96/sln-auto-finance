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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Loan', loanSchema);
