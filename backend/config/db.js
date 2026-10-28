const mongoose = require('mongoose');
const User = require('../models/User');
const Customer = require('../models/Customer');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error('MONGO_URI environment variable is not set');
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    await Promise.all([
      User.updateMany({ role: 'owner' }, { $set: { role: 'admin' } }),
      Customer.updateMany({ subRole: 'hirer' }, { $set: { subRole: 'vehicle_owner' } }),
    ]);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
