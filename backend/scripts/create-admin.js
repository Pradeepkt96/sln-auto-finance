const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const { isPasswordValid } = require('../utils/passwordPolicy');

const createAdmin = async () => {
  try {
    const { MONGO_URI, ADMIN_MOBILE, ADMIN_PASSWORD } = process.env;
    if (!MONGO_URI || !ADMIN_MOBILE || !ADMIN_PASSWORD) {
      throw new Error('MONGO_URI, ADMIN_MOBILE and ADMIN_PASSWORD must be set');
    }
    if (!/^\d{10}$/.test(ADMIN_MOBILE) || !isPasswordValid(ADMIN_PASSWORD)) {
      throw new Error('ADMIN_MOBILE must be 10 digits and ADMIN_PASSWORD must meet the password policy');
    }

    const mongoUri = MONGO_URI;
    await mongoose.connect(mongoUri);

    const existingUser = await User.findOne({ mobile: ADMIN_MOBILE });

    if (existingUser) {
      existingUser.role = 'admin';
      existingUser.password = ADMIN_PASSWORD;
      await existingUser.save();
    } else {
      await User.create({
        mobile: ADMIN_MOBILE,
        password: ADMIN_PASSWORD,
        role: 'admin'
      });
    }

    console.log('Admin account provisioned successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin. Check the database connection and required environment variables.');
    process.exit(1);
  }
};

createAdmin();
