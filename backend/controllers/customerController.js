const Customer = require('../models/Customer');

// @desc    Get all customers (with optional search/filter/sort)
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
  try {
    const { search, sortBy, sortOrder } = req.query;

    let query = {};

    // Search by name, mobile, address, or vehicle number
    if (search && search.trim()) {
      const term = search.trim();
      query = {
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { mobile: { $regex: term, $options: 'i' } },
          { address: { $regex: term, $options: 'i' } },
          { vehicleNumber: { $regex: term, $options: 'i' } },
        ],
      };
    }

    // Build sort object
    const sort = {};
    const allowedSortFields = ['name', 'mobile', 'vehicleNumber', 'createdAt'];
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
  const { name, mobile, address, vehicleNumber } = req.body;

  if (!name || !mobile || !address || !vehicleNumber) {
    return res.status(400).json({ message: 'Please provide all fields' });
  }

  // Validate 10-digit Indian mobile number
  const mobileRegex = /^[6-9]\d{9}$/;
  if (!mobileRegex.test(mobile)) {
    return res.status(400).json({ message: 'Invalid mobile number. Must be a 10-digit Indian number starting with 6-9.' });
  }

  // Validate Indian vehicle number format (e.g. TN24BB3313)
  const vehicleRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}$/;
  if (!vehicleRegex.test(vehicleNumber.toUpperCase())) {
    return res.status(400).json({ message: 'Invalid vehicle number. Use format like TN24BB3313.' });
  }

  try {
    const customer = await Customer.create({
      name,
      mobile,
      address,
      vehicleNumber: vehicleNumber.toUpperCase(),
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
