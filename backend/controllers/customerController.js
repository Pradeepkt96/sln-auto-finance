const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

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
    const allowedSortFields = ['name', 'mobile', 'createdAt', 'slNo'];
    const isSpecialSort = sortBy === 'loanNumbers';
    
    if (!isSpecialSort) {
      const field = allowedSortFields.includes(sortBy) ? sortBy : 'slNo';
      sort[field] = sortOrder === 'asc' ? 1 : -1;
    }

    const customers = await Customer.find(query).sort(sort).lean();

    // Fetch loan numbers for each customer
    const customersWithLoans = await Promise.all(
      customers.map(async (customer) => {
        const loans = await Loan.find({ customerReference: customer._id }, 'hpNumber hpaDate');
        return {
          ...customer,
          loanNumbers: loans.map((l) => ({
            hpNumber: l.hpNumber,
            hpaDate: l.hpaDate,
          })),
        };
      })
    );

    if (isSpecialSort) {
      customersWithLoans.sort((a, b) => {
        const valA = a.loanNumbers && a.loanNumbers.length > 0 ? a.loanNumbers[0].hpNumber.toString().toLowerCase() : '';
        const valB = b.loanNumbers && b.loanNumbers.length > 0 ? b.loanNumbers[0].hpNumber.toString().toLowerCase() : '';
        
        if (sortOrder === 'asc') return valA.localeCompare(valB, undefined, { numeric: true });
        return valB.localeCompare(valA, undefined, { numeric: true });
      });
    }

    res.json(customersWithLoans);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add a new customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res) => {
  const { name, mobile, altMobile, address } = req.body;

  if (!name || !mobile || !address) {
    return res.status(400).json({ message: 'Please provide all fields' });
  }

  // Validate 10-digit Indian mobile number
  const mobileRegex = /^[6-9]\d{9}$/;
  if (!mobileRegex.test(mobile)) {
    return res.status(400).json({ message: 'Invalid mobile number. Must be a 10-digit Indian number starting with 6-9.' });
  }

  try {
    // Use aggregation to reliably find the highest existing slNo
    const result = await Customer.aggregate([{ $group: { _id: null, maxSlNo: { $max: '$slNo' } } }]);
    const slNo = result.length > 0 && result[0].maxSlNo ? result[0].maxSlNo + 1 : 1;

    const customer = await Customer.create({
      slNo,
      name,
      mobile,
      altMobile,
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
      returnDocument: 'after',
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

// @desc    Upload/replace customer photo
// @route   POST /api/customers/:id/photo
// @access  Private
const uploadCustomerPhoto = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    // Get existing public id so we can delete after successful upload
    const existing = await Customer.findById(req.params.id).select('photoPublicId');
    const oldPublicId = existing?.photoPublicId;

    // Upload buffer stream to Cloudinary with transformation to optimize image
    const uploadStream = cloudinary.uploader.upload_stream({
      folder: 'customers',
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'thumb', gravity: 'face', fetch_format: 'auto', quality: 'auto' }
      ]
    }, async (error, result) => {
      if (error) {
        console.error('Cloudinary upload error:', error);
        return res.status(500).json({ message: 'Image upload failed' });
      }
      const { secure_url, public_id } = result;
      const customer = await Customer.findByIdAndUpdate(req.params.id, { photoUrl: secure_url, photoPublicId: public_id }, { returnDocument: 'after' });
      if (!customer) return res.status(404).json({ message: 'Customer not found' });

      // After successful upload and DB update, delete old image to avoid orphaned files
      if (oldPublicId && oldPublicId !== public_id) {
        try {
          await cloudinary.uploader.destroy(oldPublicId, { resource_type: 'image' });
        } catch (delErr) {
          console.error('Failed to delete old Cloudinary image:', delErr);
        }
      }

      res.json(customer);
    });

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (error) {
    console.error('Upload Customer Photo Error:', error);
    res.status(500).json({ message: 'Server error uploading photo' });
  }
};

// @desc    Delete a customer's photo
// @route   DELETE /api/customers/:id/photo
// @access  Private
const deleteCustomerPhoto = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).select('photoPublicId photoUrl');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    if (!customer.photoPublicId) return res.status(400).json({ message: 'No photo to delete' });

    try {
      await cloudinary.uploader.destroy(customer.photoPublicId, { resource_type: 'image' });
    } catch (err) {
      console.error('Cloudinary destroy error:', err);
      // proceed to clear DB fields even if Cloudinary delete failed
    }

    const updated = await Customer.findByIdAndUpdate(req.params.id, { photoUrl: null, photoPublicId: null }, { returnDocument: 'after' });
    res.json(updated);
  } catch (error) {
    console.error('Delete Customer Photo Error:', error);
    res.status(500).json({ message: 'Server error deleting photo' });
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  uploadCustomerPhoto,
  deleteCustomerPhoto,
  deleteCustomer,
};
