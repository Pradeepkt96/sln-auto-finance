const Customer = require('../models/Customer');
const Loan = require('../models/Loan');

// @desc    Get all customers (with optional search/filter/sort)
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
  try {
    const { search, sortBy, sortOrder } = req.query;

    let query = {};

    // Search by name, mobile, or address
    if (search && search.trim()) {
      const term = search.trim();
      query = {
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { mobile: { $regex: term, $options: 'i' } },
          { address: { $regex: term, $options: 'i' } },
        ],
      };
    }

    // Build sort object
    const sort = {};
    const allowedSortFields = ['name', 'mobile', 'createdAt'];
    const field = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sort[field] = sortOrder === 'asc' ? 1 : -1;

    const customers = await Customer.find(query).sort(sort).lean();

    // Fetch loan numbers for each customer
    const customersWithLoans = await Promise.all(
      customers.map(async (customer) => {
        const loans = await Loan.find({ customerReference: customer._id }, 'hpNumber');
        return {
          ...customer,
          loanNumbers: loans.map((l) => l.hpNumber),
        };
      })
    );

    res.json(customersWithLoans);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add a new customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res) => {
  const { name, mobile, address } = req.body;

  if (!name || !mobile || !address) {
    return res.status(400).json({ message: 'Please provide all fields' });
  }

  // Validate 10-digit Indian mobile number
  const mobileRegex = /^[6-9]\d{9}$/;
  if (!mobileRegex.test(mobile)) {
    return res.status(400).json({ message: 'Invalid mobile number. Must be a 10-digit Indian number starting with 6-9.' });
  }

  try {
    const customer = await Customer.create({
      name,
      mobile,
      address,
      createdBy: req.user._id,
    });
    res.status(201).json(customer);
  } catch (error) {
    console.error('Customer Creation Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Customer with this mobile number already exists' });
    }
    res.status(500).json({ message: error.message || 'Server error adding customer' });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Customer Update Error:', error);
    res.status(500).json({ message: error.message || 'Server error updating customer' });
  }
};

// @desc    Delete customer (Admin restricted)
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can delete customers' });
    }

    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Also delete associated loans and payments? 
    // For now just delete customer, but usually you'd want to handle orphans.
    await Loan.deleteMany({ customerReference: req.params.id });

    res.json({ message: 'Customer and associated loans deleted successfully' });
  } catch (error) {
    console.error('Customer Delete Error:', error);
    res.status(500).json({ message: error.message || 'Server error deleting customer' });
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
