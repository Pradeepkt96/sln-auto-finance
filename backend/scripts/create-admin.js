const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sln_auto_finance';
    await mongoose.connect(mongoUri);

    const mobile = '8317343946';
    const password = 'pradeep123'; // Default password

    const existingUser = await User.findOne({ mobile });

    if (existingUser) {
      existingUser.role = 'admin';
      existingUser.password = password; // it will be hashed by the pre-save hook
      await existingUser.save();
      console.log('User already existed. Updated to admin with password: ' + password);
    } else {
      await User.create({
        mobile,
        password,
        role: 'admin'
      });
      console.log('Admin user successfully created!');
      console.log(`Mobile: ${mobile}`);
      console.log(`Password: ${password}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
};

createAdmin();
