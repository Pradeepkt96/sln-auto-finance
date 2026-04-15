const Loan = require('../models/Loan');
const Payment = require('../models/Payment');

// @desc    Get all loans (with optional search/filter)
// @route   GET /api/loans
// @access  Private
const getLoans = async (req, res) => {
  try {
    const { search, status, sortBy, sortOrder } = req.query;

    let query = {};

    // Status filter
    if (status && ['active', 'closed', 'default'].includes(status)) {
      query.status = status;
    }

    // Build sort object
    const sort = {};
    const allowedSortFields = ['loanAmount', 'emiAmount', 'installments', 'createdAt'];
    const field = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sort[field] = sortOrder === 'asc' ? 1 : -1;

    let loans = await Loan.find(query)
      .populate('customerReference', 'name mobile')
      .sort(sort);

    // Search by HP number, vehicle number, make, model, or customer name/mobile (post-populate)
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      loans = loans.filter(loan =>
        loan.hpNumber?.toLowerCase().includes(term) ||
        loan.vehicleNumber?.toLowerCase().includes(term) ||
        loan.make?.toLowerCase().includes(term) ||
        loan.vehicleModel?.toLowerCase().includes(term) ||
        loan.customerReference?.name?.toLowerCase().includes(term) ||
        loan.customerReference?.mobile?.includes(term)
      );
    }

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
    loanAmount, interestRate, installments, emiAmount,
  } = req.body;

  // Validate vehicle number format
  const vehicleRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}$/;
  if (!vehicleNumber || !vehicleRegex.test(vehicleNumber.toUpperCase())) {
    return res.status(400).json({ message: 'Invalid vehicle number. Use format like TN24BB3313.' });
  }

  try {
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
    });

    // Auto-generate pending payments for each installment
    const paymentDocs = [];
    let currentDate = new Date();
    for (let i = 1; i <= installments; i++) {
      currentDate.setMonth(currentDate.getMonth() + 1);
      paymentDocs.push({
        loanReference: loan._id,
        installmentNumber: i,
        dueDate: new Date(currentDate),
        amount: emiAmount,
        status: 'pending',
      });
    }

    await Payment.insertMany(paymentDocs);

    res.status(201).json(loan);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating loan' });
  }
};

// @desc    Update loan status (admin only)
// @route   PUT /api/loans/:id/status
// @access  Private
const updateLoanStatus = async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['active', 'closed', 'default'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const loan = await Loan.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('customerReference', 'name mobile');

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    res.json(loan);
  } catch (error) {
    console.error('updateLoanStatus error:', error.message, error.stack);
    res.status(500).json({ message: error.message || 'Server error updating loan status' });
  }
};

module.exports = {
  getLoans,
  createLoan,
  updateLoanStatus,
};
