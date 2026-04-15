const Customer = require('../models/Customer');

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

    const customers = await Customer.find(query).sort(sort);
    res.json(customers);
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
    res.status(500).json({ message: 'Server error adding customer' });
  }
};

module.exports = {
  getCustomers,
  createCustomer,
};
