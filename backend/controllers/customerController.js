const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const {
  getCustomerDisplayName,
  normalizeCustomerName,
  validateFatherName,
} = require('../utils/customerName');

// @desc    Get all customers (with optional search/filter/sort)
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
  try {
    const {
      search,
      sortBy,
      sortOrder,
      includeLoanNumbers = 'true',
      vehicleOwnersOnly,
      page,
      pageSize,
    } = req.query;
    const shouldIncludeLoanNumbers = includeLoanNumbers !== 'false';
    const parsedPage = parseInt(page, 10);
    const parsedPageSize = parseInt(pageSize, 10);
    const shouldPaginate = !isNaN(parsedPage) || !isNaN(parsedPageSize);
    const effectivePage = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const allowedPageSizes = [10, 20, 30, 50, 100];
    const effectivePageSize = shouldPaginate
      ? (allowedPageSizes.includes(parsedPageSize) ? parsedPageSize : 10)
      : null;
    const skip = shouldPaginate ? (effectivePage - 1) * effectivePageSize : 0;

    let query = {};
    if (vehicleOwnersOnly === 'true') {
      const guarantorIds = await Loan.distinct('guarantorReference', {
        guarantorReference: { $ne: null },
      });
      query = {
        $or: [
          { subRole: 'vehicle_owner' },
          { _id: { $in: guarantorIds } },
        ],
      };
    }

    // Search by split or legacy name, mobile, or address
    if (search && search.trim()) {
      const term = search.trim();
      const searchQuery = {
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { firstName: { $regex: term, $options: 'i' } },
          { initial: { $regex: term, $options: 'i' } },
          { fatherName: { $regex: term, $options: 'i' } },
          { mobile: { $regex: term, $options: 'i' } },
          { address: { $regex: term, $options: 'i' } },
        ],
      };
      query = Object.keys(query).length
        ? { $and: [query, searchQuery] }
        : searchQuery;
    }

    // Build sort object
    const sort = {};
    const allowedSortFields = ['name', 'firstName', 'initial', 'fatherName', 'mobile', 'createdAt', 'slNo'];
    const isSpecialSort = sortBy === 'loanNumbers';
    
    if (!isSpecialSort) {
      const field = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      sort[field] = sortOrder === 'asc' ? 1 : -1;
    }

    let customers;
    let totalRecords = 0;
    if (shouldPaginate && !isSpecialSort) {
      totalRecords = await Customer.countDocuments(query);
      if (vehicleOwnersOnly === 'true') {
        const field = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const direction = sortOrder === 'asc' ? 1 : -1;
        customers = await Customer.aggregate([
          { $match: query },
          {
            $addFields: {
              customerRoleOrder: {
                $cond: [{ $eq: ['$subRole', 'guarantor'] }, 1, 0],
              },
            },
          },
          { $sort: { customerRoleOrder: 1, [field]: direction, _id: 1 } },
          { $skip: skip },
          { $limit: effectivePageSize },
          { $project: { customerRoleOrder: 0 } },
        ]);
      } else {
        customers = await Customer.find(query)
          .sort(sort)
          .skip(skip)
          .limit(effectivePageSize)
          .lean();
      }
    } else {
      if (shouldPaginate) {
        totalRecords = await Customer.countDocuments(query);
      }
      customers = await Customer.find(query).sort(sort).lean();
    }

    const duplicatedMobiles = await Customer.aggregate([
      { $group: { _id: '$mobile', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);
    const duplicateMobileNumbers = new Set(duplicatedMobiles.map(({ _id }) => _id));

    const normalizedCustomers = customers.map((customer) => ({
      ...customer,
      ...normalizeCustomerName(customer),
      name: getCustomerDisplayName(customer),
      duplicateMobile: duplicateMobileNumbers.has(customer.mobile),
    }));

    if (!shouldIncludeLoanNumbers) {
      if (!shouldPaginate) {
        return res.json(normalizedCustomers);
      }
      return res.json({
        items: normalizedCustomers,
        meta: {
          page: effectivePage,
          pageSize: effectivePageSize,
          totalPages: Math.ceil(totalRecords / effectivePageSize),
          totalRecords,
        },
      });
    }

    const customerIds = normalizedCustomers.map((customer) => customer._id);
    const customerIdSet = new Set(customerIds.map((id) => id.toString()));
    const loans = await Loan.find({
      $or: [
        { customerReference: { $in: customerIds } },
        { guarantorReference: { $in: customerIds } },
      ],
    }, 'customerReference guarantorReference hpNumber hpaDate').lean();

    const loansByCustomerId = new Map();
    loans.forEach((loan) => {
      const ownerId = loan.customerReference?.toString();
      const guarantorId = loan.guarantorReference?.toString();
      const loanDetails = {
        hpNumber: loan.hpNumber,
        hpaDate: loan.hpaDate,
      };

      if (customerIdSet.has(ownerId)) {
        if (!loansByCustomerId.has(ownerId)) loansByCustomerId.set(ownerId, []);
        loansByCustomerId.get(ownerId).push({ ...loanDetails, role: 'vehicle_owner' });
      }

      if (guarantorId && customerIdSet.has(guarantorId)) {
        if (!loansByCustomerId.has(guarantorId)) loansByCustomerId.set(guarantorId, []);
        loansByCustomerId.get(guarantorId).push({ ...loanDetails, role: 'guarantor' });
      }
    });

    const customersWithLoans = normalizedCustomers.map((customer) => ({
      ...customer,
      loanNumbers: loansByCustomerId.get(customer._id.toString()) || [],
    }));

    if (vehicleOwnersOnly === 'true' && !isSpecialSort) {
      customersWithLoans.sort((a, b) => {
        const roleOrderA = a.subRole === 'guarantor' ? 1 : 0;
        const roleOrderB = b.subRole === 'guarantor' ? 1 : 0;
        return roleOrderA - roleOrderB;
      });
    } else if (isSpecialSort) {
      customersWithLoans.sort((a, b) => {
        if (vehicleOwnersOnly === 'true') {
          const roleOrderA = a.subRole === 'guarantor' ? 1 : 0;
          const roleOrderB = b.subRole === 'guarantor' ? 1 : 0;
          if (roleOrderA !== roleOrderB) return roleOrderA - roleOrderB;
        }

        const valA = a.loanNumbers && a.loanNumbers.length > 0 ? a.loanNumbers[0].hpNumber.toString().toLowerCase() : '';
        const valB = b.loanNumbers && b.loanNumbers.length > 0 ? b.loanNumbers[0].hpNumber.toString().toLowerCase() : '';
        
        const loanNumberOrder = valA.localeCompare(valB, undefined, { numeric: true });
        if (loanNumberOrder !== 0) {
          return sortOrder === 'asc' ? loanNumberOrder : -loanNumberOrder;
        }

        const dateOrder = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        return dateOrder || a._id.toString().localeCompare(b._id.toString());
      });
    }

    if (!shouldPaginate) {
      return res.json(customersWithLoans);
    }

    const paginatedCustomers = isSpecialSort
      ? customersWithLoans.slice(skip, skip + effectivePageSize)
      : customersWithLoans;

    return res.json({
      items: paginatedCustomers,
      meta: {
        page: effectivePage,
        pageSize: effectivePageSize,
        totalPages: Math.ceil(totalRecords / effectivePageSize),
        totalRecords,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add a new customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res) => {
  const { firstName, initial, fatherName, mobile, altMobile, address, subRole } = req.body;
  const relationType = req.body.relationType || 'S/O';
  const normalizedName = normalizeCustomerName(req.body);
  const normalizedSubRole = subRole === 'hirer' ? 'vehicle_owner' : subRole || 'vehicle_owner';

  if (!['vehicle_owner', 'guarantor'].includes(normalizedSubRole)) {
    return res.status(400).json({ message: 'Invalid customer sub-role' });
  }

  if (!normalizedName.firstName || !mobile || !address) {
    return res.status(400).json({ message: 'Please provide first name, mobile number, and address' });
  }

  if (fatherName && !validateFatherName(fatherName)) {
    return res.status(400).json({ message: 'Father name must contain only a first name' });
  }
  if (!['S/O', 'W/O', 'C/O'].includes(relationType)) {
    return res.status(400).json({ message: 'Invalid customer relationship type' });
  }

  const mobileRegex = /^[6-9]\d{9}$/;
  if (!mobileRegex.test(mobile)) {
    return res.status(400).json({ message: 'Invalid mobile number. Must be a 10-digit Indian number starting with 6-9.' });
  }

  try {
    const existingCustomer = await Customer.findOne({ mobile }).select('_id');
    if (existingCustomer) {
      return res.status(409).json({ message: 'A customer with this mobile number already exists' });
    }

    const result = await Customer.aggregate([{ $group: { _id: null, maxSlNo: { $max: '$slNo' } } }]);
    const slNo = result.length > 0 && result[0].maxSlNo ? result[0].maxSlNo + 1 : 1;

    const customer = await Customer.create({
      slNo,
      name: getCustomerDisplayName(normalizedName),
      firstName: normalizedName.firstName,
      initial: normalizedName.initial,
      fatherName: normalizedName.fatherName,
      relationType,
      mobile,
      altMobile,
      address,
      subRole: normalizedSubRole,
      createdBy: req.user._id,
    });
    res.status(201).json(customer);
  } catch (error) {
    console.error('Customer Creation Error:', error);
    if (error.code === 11000 && error.keyPattern?.mobile) {
      return res.status(409).json({ message: 'A customer with this mobile number already exists' });
    }
    res.status(500).json({ message: error.message || 'Server error adding customer' });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res) => {
  try {
    const normalizedName = normalizeCustomerName(req.body);
    const update = {
      ...req.body,
      ...normalizedName,
      name: getCustomerDisplayName(normalizedName),
    };

    if (update.subRole === 'hirer') update.subRole = 'vehicle_owner';

    if (update.subRole && !['vehicle_owner', 'guarantor'].includes(update.subRole)) {
      return res.status(400).json({ message: 'Invalid customer sub-role' });
    }

    if (update.fatherName && !validateFatherName(update.fatherName)) {
      return res.status(400).json({ message: 'Father name must contain only a first name' });
    }
    if (update.relationType && !['S/O', 'W/O', 'C/O'].includes(update.relationType)) {
      return res.status(400).json({ message: 'Invalid customer relationship type' });
    }
    if (update.mobile !== undefined) {
      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRegex.test(update.mobile)) {
        return res.status(400).json({ message: 'Invalid mobile number. Must be a 10-digit Indian number starting with 6-9.' });
      }
      const duplicate = await Customer.findOne({ mobile: update.mobile, _id: { $ne: req.params.id } }).select('_id');
      if (duplicate) {
        return res.status(409).json({ message: 'A customer with this mobile number already exists' });
      }
    }

    const customer = await Customer.findByIdAndUpdate(req.params.id, update, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Customer Update Error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A customer with this mobile number already exists' });
    }
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
