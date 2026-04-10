const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');

const router = express.Router();

// @desc    Get dashboard metrics
// @route   GET /api/dashboard
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const activeLoansCount = await Loan.countDocuments({ status: 'active' });
    
    // Today's collections
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayPayments = await Payment.aggregate([
      { 
        $match: { 
          paidDate: { $gte: startOfDay, $lte: endOfDay },
          status: 'paid' 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const todaysCollection = todayPayments.length > 0 ? todayPayments[0].total : 0;

    // Overdue loans (pending payments where due date < today)
    const overdueCount = await Payment.countDocuments({
      status: 'pending',
      dueDate: { $lt: startOfDay }
    });

    // Monthly revenue (payments paid this month)
    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
    const monthlyPayments = await Payment.aggregate([
      { 
        $match: { 
          paidDate: { $gte: startOfMonth },
          status: 'paid' 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const monthlyRevenue = monthlyPayments.length > 0 ? monthlyPayments[0].total : 0;

    res.json({
      activeLoans: activeLoansCount,
      todaysCollection,
      overdueLoans: overdueCount,
      monthlyRevenue,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching dashboard metrics' });
  }
});

module.exports = router;
