const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    loanReference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
      required: true,
    },
    installmentNumber: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paidDate: {
      type: Date,
    },
    amount: {
      type: Number,
      required: true, // EMI Amount or installment amount due
    },
    receivedAmount: {
      type: Number,
      default: 0,
    },
    receiptNo: {
      type: String,
      default: '',
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'online', 'cheque', 'other'],
      default: 'cash',
    },
    penalty: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'partially_paid'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
