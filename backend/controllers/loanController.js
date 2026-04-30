const Loan = require('../models/Loan');
const Payment = require('../models/Payment');

const logDebug = (msg, data) => {
  console.log(`[DEBUG] ${msg}${data ? ': ' + JSON.stringify(data) : ''}`);
};

// @desc    Get all loans (with optional search/filter)
// @route   GET /api/loans
// @access  Private
const getLoans = async (req, res) => {
  try {
    const { hpNumber, hpaDate, customer, vehicleNumber, status, sortBy, sortOrder } = req.query;
    const query = {};

    if (status && ['active', 'closed', 'reloan', 'collection'].includes(status)) {
      query.status = status;
    }

    if (hpNumber && hpNumber.trim()) {
      query.hpNumber = { $regex: hpNumber.trim(), $options: 'i' };
    }

    if (vehicleNumber && vehicleNumber.trim()) {
      const term = vehicleNumber.trim();
      query.$or = [
        { vehicleNumber: { $regex: term, $options: 'i' } },
        { make: { $regex: term, $options: 'i' } },
        { vehicleModel: { $regex: term, $options: 'i' } },
      ];
    }

    const customerMatch = customer && customer.trim()
      ? {
          $or: [
            { 'customerReference.name': { $regex: customer.trim(), $options: 'i' } },
            { 'customerReference.mobile': { $regex: customer.trim(), $options: 'i' } },
          ],
        }
      : null;

    const hpaDateMatch = hpaDate && hpaDate.trim()
      ? {
          hpaDateDisplay: { $regex: hpaDate.trim() },
        }
      : null;

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const allowedSortFields = ['loanAmount', 'emiAmount', 'installments', 'createdAt', 'hpNumber', 'hpaDate', 'status'];
    const sortField = sortBy === 'customerReference'
      ? 'customerReference.name'
      : (allowedSortFields.includes(sortBy) ? sortBy : 'createdAt');

    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerReference',
          foreignField: '_id',
          as: 'customerReference',
          pipeline: [
            {
              $project: {
                name: 1,
                mobile: 1,
                photoUrl: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$customerReference',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          hpaDateDisplay: {
            $cond: [
              { $ifNull: ['$hpaDate', false] },
              { $dateToString: { format: '%d/%m/%Y', date: '$hpaDate' } },
              '',
            ],
          },
        },
      },
    ];

    if (customerMatch) {
      pipeline.push({ $match: customerMatch });
    }

    if (hpaDateMatch) {
      pipeline.push({ $match: hpaDateMatch });
    }

    pipeline.push(
      { $sort: { [sortField]: sortDirection, _id: 1 } },
      { $project: { hpaDateDisplay: 0 } }
    );

    const loans = await Loan.aggregate(pipeline).collation({ locale: 'en_US', numericOrdering: true });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new loan
// @route   POST /api/loans
// @access  Private
const createLoan = async (req, res) => {
  const {
    hpNumber, customerReference,
    vehicleNumber, make, vehicleModel, color,
    loanAmount, interestRate, installments, emiAmount, hpaDate,
  } = req.body;

  logDebug('--- CREATE LOAN REQUEST ---', req.body);

  if (!hpaDate) {
    return res.status(400).json({ message: 'HPA Date is required' });
  }

  // Validate vehicle number format
  const vehicleRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}$/;
  if (!vehicleNumber || !vehicleRegex.test(vehicleNumber.toUpperCase())) {
    return res.status(400).json({ message: 'Invalid vehicle number. Use format like TN24BB3313.' });
  }

  try {
    console.log('Creating loan with payload:', req.body);
    const loan = await Loan.create({
      hpNumber,
      customerReference,
      vehicleNumber: vehicleNumber.toUpperCase(),
      make,
      vehicleModel,
      color: color || '',
      loanAmount,
      interestRate,
      installments,
      emiAmount,
      hpaDate: hpaDate ? new Date(hpaDate) : undefined,
    });

    console.log('Loan created successfully:', loan._id);

    // Auto-generate pending payments for each installment
    const paymentDocs = [];
    let currentDate = new Date(hpaDate);
    for (let i = 1; i <= installments; i++) {
      let dueDate = new Date(currentDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      paymentDocs.push({
        loanReference: loan._id,
        installmentNumber: i,
        dueDate: dueDate,
        amount: emiAmount,
        status: 'pending',
      });
    }

    await Payment.insertMany(paymentDocs);
    console.log('Payments generated:', paymentDocs.length);

    res.status(201).json(loan);
  } catch (error) {
    console.error('Loan Creation Error:', error);
    res.status(500).json({ message: error.message || 'Server error creating loan' });
  }
};

// @desc    Update loan status (admin only)
// @route   PUT /api/loans/:id/status
// @access  Private
const updateLoanStatus = async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['active', 'closed', 'reloan', 'collection'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const loan = await Loan.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: 'after', runValidators: true }
    ).populate('customerReference', 'name mobile photoUrl');

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    res.json(loan);
  } catch (error) {
    console.error('Update Loan Status Error:', error);
    res.status(500).json({ message: error.message || 'Server error updating loan status' });
  }
};

// @desc    Update loan details
// @route   PUT /api/loans/:id
// @access  Private
const updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.findById(id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const oldHpaTime    = loan.hpaDate     ? new Date(loan.hpaDate).getTime() : 0;
    const oldInstallments = loan.installments;
    const oldEmiAmount  = loan.emiAmount;

    // Update fields from req.body
    const fieldsToUpdate = [
      'hpNumber', 'customerReference', 'vehicleNumber', 'make',
      'vehicleModel', 'color', 'loanAmount', 'interestRate',
      'installments', 'emiAmount', 'status', 'hpaDate',
    ];

    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'hpaDate') {
          if (req.body[field]) loan[field] = new Date(req.body[field]);
        } else if (field === 'vehicleNumber') {
          loan[field] = req.body[field].toUpperCase();
        } else {
          loan[field] = req.body[field];
        }
      }
    });

    await loan.save();

    const newHpaTime         = loan.hpaDate ? new Date(loan.hpaDate).getTime() : 0;
    const installmentsChanged = Number(loan.installments) !== Number(oldInstallments);
    const hpaChanged          = newHpaTime !== oldHpaTime && !!loan.hpaDate;
    const emiChanged          = Number(loan.emiAmount) !== Number(oldEmiAmount);

    if (installmentsChanged && loan.hpaDate) {
      // Installments count changed — delete unpaid payment rows and regenerate
      await Payment.deleteMany({
        loanReference: loan._id,
        status: { $in: ['pending', 'overdue'] },
      });

      const paidPayments = await Payment.find({
        loanReference: loan._id,
        status: { $in: ['paid', 'partially_paid'] },
      });
      const paidNumbers = new Set(paidPayments.map(p => p.installmentNumber));

      const newPaymentDocs = [];
      const baseDate = new Date(loan.hpaDate);
      for (let i = 1; i <= loan.installments; i++) {
        if (paidNumbers.has(i)) continue;
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        newPaymentDocs.push({
          loanReference: loan._id,
          installmentNumber: i,
          dueDate,
          amount: loan.emiAmount,
          status: 'pending',
        });
      }
      if (newPaymentDocs.length > 0) await Payment.insertMany(newPaymentDocs);

    } else if (hpaChanged || emiChanged) {
      // Update due dates and/or emi amount on all unpaid (pending + overdue) payments
      const unpaidPayments = await Payment.find({
        loanReference: loan._id,
        status: { $in: ['pending', 'overdue'] },
      });

      const updatePromises = unpaidPayments.map(p => {
        const updateFields = {};
        if (hpaChanged) {
          const resetDate = new Date(loan.hpaDate);
          resetDate.setMonth(resetDate.getMonth() + p.installmentNumber);
          updateFields.dueDate = resetDate;
        }
        if (emiChanged) updateFields.amount = loan.emiAmount;
        return Payment.findByIdAndUpdate(p._id, updateFields);
      });

      await Promise.all(updatePromises);
    }

    const updatedLoan = await Loan.findById(loan._id).populate('customerReference', 'name mobile photoUrl');
    res.json(updatedLoan);
  } catch (error) {
    console.error('Loan Update Error:', error);
    res.status(500).json({ message: error.message || 'Server error updating loan' });
  }
};

// @desc    Delete loan (Admin restricted)
// @route   DELETE /api/loans/:id
// @access  Private
const deleteLoan = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can delete loans' });
    }

    const loan = await Loan.findByIdAndDelete(req.params.id);

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Delete associated payments
    await Payment.deleteMany({ loanReference: req.params.id });

    res.json({ message: 'Loan and associated payments deleted successfully' });
  } catch (error) {
    console.error('Loan Delete Error:', error);
    res.status(500).json({ message: error.message || 'Server error deleting loan' });
  }
};

// @desc    Get loan payments (installments)
// @route   GET /api/loans/:id/payments
// @access  Private
const getLoanPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ loanReference: req.params.id }).sort('installmentNumber');
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching payments' });
  }
};

// @desc    Update payment (record receipt)
// @route   PUT /api/payments/:id
// @access  Private
const updatePayment = async (req, res) => {
  const { receivedAmount, receiptNo, paymentMode, penalty, collectionCharges, collectionChargesEnabled, status, paidDate } = req.body;

  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        receivedAmount,
        receiptNo,
        paymentMode,
        penalty,
        collectionCharges,
        collectionChargesEnabled,
        status,
        paidDate: paidDate || new Date(),
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating payment' });
  }
};

// @desc    Recalculate all unpaid payment due dates from a given first due date
// @route   PUT /api/loans/:id/recalculate-dues
// @access  Private
const recalculateDueDates = async (req, res) => {
  try {
    const { firstDueDate } = req.body;
    if (!firstDueDate) return res.status(400).json({ message: 'firstDueDate is required' });

    const baseDate = new Date(firstDueDate);
    if (isNaN(baseDate.getTime())) return res.status(400).json({ message: 'Invalid firstDueDate' });

    // All unpaid payments sorted by installment number
    const unpaidPayments = await Payment.find({
      loanReference: req.params.id,
      status: { $in: ['pending', 'overdue'] },
    }).sort({ installmentNumber: 1 });

    if (unpaidPayments.length === 0) {
      const allPayments = await Payment.find({ loanReference: req.params.id }).sort({ installmentNumber: 1 });
      return res.json(allPayments);
    }

    const updatePromises = unpaidPayments.map((p, idx) => {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(baseDate.getMonth() + idx); // 0-based offset per slot
      return Payment.findByIdAndUpdate(p._id, { dueDate }, { returnDocument: 'after' });
    });

    await Promise.all(updatePromises);

    const allPayments = await Payment.find({ loanReference: req.params.id }).sort({ installmentNumber: 1 });
    res.json(allPayments);
  } catch (error) {
    console.error('Recalculate Due Dates Error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  getLoans,
  createLoan,
  updateLoanStatus,
  updateLoan,
  deleteLoan,
  getLoanPayments,
  updatePayment,
  recalculateDueDates,
};
