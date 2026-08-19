const express = require('express');
const { getCustomers, createCustomer, updateCustomer, deleteCustomer } = require('../controllers/customerController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const multer = require('multer');
const { uploadCustomerPhoto, deleteCustomerPhoto } = require('../controllers/customerController');

// Multer config: memory storage, 5MB limit, and file filter for images only
const storage = multer.memoryStorage();
const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage,
  limits: { fileSize: FILE_SIZE_LIMIT },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG and WEBP images are allowed'));
  }
});

const router = express.Router();

router.route('/')
  .get(protect, getCustomers)
  .post(protect, authorizeRoles('owner', 'admin'), createCustomer);

router.route('/:id')
  .put(protect, authorizeRoles('owner', 'admin', 'staff'), updateCustomer)
  .delete(protect, authorizeRoles('owner', 'admin'), deleteCustomer);

// Upload customer photo
router.post('/:id/photo', protect, authorizeRoles('owner', 'admin', 'staff'), upload.single('photo'), uploadCustomerPhoto);

// Delete customer photo
router.delete('/:id/photo', protect, authorizeRoles('owner', 'admin', 'staff'), deleteCustomerPhoto);

module.exports = router;
